import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import bcrypt
import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import ApiToken, User

settings = get_settings()

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


# --- JWT ---


def create_access_token(user_id: int) -> tuple[str, int]:
    expires_delta = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


def create_refresh_token(user_id: int) -> str:
    expires_delta = timedelta(days=settings.jwt_refresh_token_expire_days)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError:
        return None


# --- API tokens ---


def hash_api_token(raw_token: str) -> str:
    return bcrypt.hashpw(raw_token.encode(), bcrypt.gensalt()).decode()


def verify_api_token(raw_token: str, hashed: str) -> bool:
    return bcrypt.checkpw(raw_token.encode(), hashed.encode())


def generate_api_token() -> str:
    return secrets.token_urlsafe(32)


# --- OAuth: GitHub ---


def get_github_authorize_url(state: str) -> str:
    if not settings.github_client_id or not settings.github_client_secret:
        raise ValueError("GitHub OAuth is not configured (missing client id/secret)")
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": f"{settings.app_url}/api/v1/auth/callback/github",
        "scope": "read:user user:email",
        "state": state,
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_github_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": f"{settings.app_url}/api/v1/auth/callback/github",
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        token_data = resp.json()

        if "access_token" not in token_data:
            raise ValueError(f"GitHub OAuth error: {token_data.get('error_description', 'Unknown')}")

        access_token = token_data["access_token"]

        user_resp = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_resp.raise_for_status()
        user_data = user_resp.json()

        email = user_data.get("email")
        if not email:
            emails_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if emails_resp.status_code == 200:
                for e in emails_resp.json():
                    if e.get("primary"):
                        email = e["email"]
                        break

        return {
            "oauth_id": str(user_data["id"]),
            "username": user_data["login"],
            "email": email,
            "avatar_url": user_data.get("avatar_url"),
        }


# --- User management ---


async def get_or_create_oauth_user(
    db: AsyncSession, provider: str, oauth_data: dict
) -> User:
    result = await db.execute(
        select(User).where(
            User.oauth_provider == provider,
            User.oauth_id == oauth_data["oauth_id"],
        )
    )
    user = result.scalar_one_or_none()

    if user:
        user.last_login = datetime.now(timezone.utc)
        if oauth_data.get("avatar_url"):
            user.avatar_url = oauth_data["avatar_url"]
        if oauth_data.get("email") and not user.email:
            user.email = oauth_data["email"]
        await db.commit()
        return user

    # New user -- ensure unique username
    base_username = oauth_data["username"]
    username = base_username
    counter = 1
    while True:
        exists = await db.execute(select(User).where(User.username == username))
        if not exists.scalar_one_or_none():
            break
        username = f"{base_username}_{counter}"
        counter += 1

    user = User(
        username=username,
        email=oauth_data.get("email"),
        oauth_provider=provider,
        oauth_id=oauth_data["oauth_id"],
        avatar_url=oauth_data.get("avatar_url"),
        last_login=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_api_token(db: AsyncSession, raw_token: str) -> User | None:
    """Look up a user by their raw API token (bcrypt-verified)."""
    result = await db.execute(
        select(ApiToken).where(
            ApiToken.revoked == False,  # noqa: E712
        )
    )
    tokens = result.scalars().all()
    for token in tokens:
        if token.expires_at and token.expires_at < datetime.now(timezone.utc):
            continue
        if verify_api_token(raw_token, token.token_hash):
            token.last_used = datetime.now(timezone.utc)
            await db.commit()
            user_result = await db.execute(select(User).where(User.id == token.user_id))
            return user_result.scalar_one_or_none()
    return None
