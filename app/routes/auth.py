import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import get_redis
from app.models.user import ApiToken, User
from app.schemas.auth import ApiTokenCreate, ApiTokenListItem, ApiTokenResponse, TokenResponse
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    exchange_github_code,
    generate_api_token,
    get_github_authorize_url,
    get_or_create_oauth_user,
    hash_api_token,
)
from app.services.xp import level_from_xp, rank_title

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])


# --- OAuth login/callback ---


@router.get("/login/{provider}")
async def login(provider: str):
    """Initiate OAuth login. Returns redirect URL for the frontend to navigate to."""
    if provider != "github":
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    redis = await get_redis()
    state = secrets.token_urlsafe(32)
    await redis.setex(f"oauth_state:{state}", 300, provider)

    try:
        url = get_github_authorize_url(state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"redirect_url": url}


@router.get("/callback/{provider}")
async def callback(
    provider: str,
    code: str,
    state: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Handle OAuth callback from provider.

    Sets refresh token as httpOnly cookie and redirects to frontend
    with a one-time auth code that can be exchanged for an access token.
    """
    if provider != "github":
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    redis = await get_redis()
    stored_provider = await redis.get(f"oauth_state:{state}")
    if not stored_provider or stored_provider != provider:
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter")
    await redis.delete(f"oauth_state:{state}")

    try:
        oauth_data = await exchange_github_code(code)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OAuth provider error: {str(e)[:200]}")

    user = await get_or_create_oauth_user(db, provider, oauth_data)

    access_token, expires_in = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Store access token temporarily in Redis for the frontend to pick up
    auth_code = secrets.token_urlsafe(32)
    await redis.setex(
        f"auth_code:{auth_code}",
        60,  # 1 minute TTL
        f"{access_token}:{expires_in}",
    )

    # Set refresh token as httpOnly cookie
    response = RedirectResponse(url=f"/?auth_code={auth_code}", status_code=302)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.app_url.startswith("https"),
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 3600,
        path="/",
    )
    return response


@router.post("/exchange")
async def exchange_auth_code(request: Request):
    """Exchange a one-time auth code for an access token.

    Called by the frontend after OAuth redirect.
    """
    body = await request.json()
    auth_code = body.get("auth_code")
    if not auth_code:
        raise HTTPException(status_code=400, detail="Missing auth_code")

    redis = await get_redis()
    token_data = await redis.get(f"auth_code:{auth_code}")
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired auth code")

    # Delete after use (one-time)
    await redis.delete(f"auth_code:{auth_code}")

    access_token, expires_in = token_data.rsplit(":", 1)
    return TokenResponse(
        access_token=access_token,
        expires_in=int(expires_in),
    )


@router.post("/refresh")
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    """Refresh access token using the refresh token cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    access_token, expires_in = create_access_token(user.id)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookies."""
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


# --- Current user info ---


@router.get("/me")
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user info."""
    level = level_from_xp(user.xp)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "xp": user.xp,
        "level": level,
        "rank": rank_title(level),
        "oauth_provider": user.oauth_provider,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# --- API Tokens ---


@router.get("/tokens", response_model=list[ApiTokenListItem])
async def list_tokens(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's API tokens."""
    result = await db.execute(
        select(ApiToken)
        .where(ApiToken.user_id == user.id)
        .order_by(ApiToken.created_at.desc())
    )
    return result.scalars().all()


@router.post("/tokens", response_model=ApiTokenResponse)
async def create_token(
    body: ApiTokenCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API token. The raw token is only returned once."""
    raw_token = generate_api_token()
    token_hash = hash_api_token(raw_token)

    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    api_token = ApiToken(
        user_id=user.id,
        token_hash=token_hash,
        name=body.name,
        expires_at=expires_at,
    )
    db.add(api_token)
    await db.commit()
    await db.refresh(api_token)

    return ApiTokenResponse(
        id=api_token.id,
        name=api_token.name,
        token=raw_token,
        last_used=None,
        expires_at=api_token.expires_at,
        created_at=api_token.created_at,
        revoked=False,
    )


@router.delete("/tokens/{token_id}")
async def revoke_token(
    token_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API token."""
    result = await db.execute(
        select(ApiToken).where(ApiToken.id == token_id, ApiToken.user_id == user.id)
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    token.revoked = True
    await db.commit()
    return {"message": "Token revoked"}
