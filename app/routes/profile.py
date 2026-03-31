from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, get_current_user_optional
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.stats import ProfileUpdate, UserStats
from app.services.badges import get_user_badges
from app.services.stats import get_user_stats
from app.services.xp import level_from_xp, rank_title

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserStats)
async def my_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's profile and stats."""
    return await get_user_stats(db, user)


@router.put("")
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's display name."""
    if body.username != user.username:
        result = await db.execute(
            select(User).where(User.username == body.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already taken")

    user.username = body.username
    await db.commit()
    return await get_user_stats(db, user)


@router.get("/{user_id}", response_model=UserStats)
async def public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a user's public profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await get_user_stats(db, user)


@router.get("/{user_id}/badges")
async def user_badges(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all badges for a user (earned + unearned)."""
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")
    return await get_user_badges(db, user_id)


@router.get("/{user_id}/badge.svg")
async def user_badge_svg(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Generate a dynamic SVG badge image for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stats = await get_user_stats(db, user)
    badges = await get_user_badges(db, user_id)
    earned_count = sum(1 for b in badges if b["earned"])

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <rect width="400" height="120" rx="8" fill="url(#bg)"/>
  <rect x="1" y="1" width="398" height="118" rx="7" fill="none" stroke="#0d9373" stroke-width="1" opacity="0.5"/>
  <text x="16" y="28" fill="#0d9373" font-family="monospace" font-size="11" font-weight="bold">WARDROVE</text>
  <text x="16" y="52" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="bold">{_svg_escape(user.username)}</text>
  <text x="16" y="72" fill="#9ca3af" font-family="monospace" font-size="11">Lvl {stats["level"]} · {stats["rank"]}</text>
  <text x="16" y="92" fill="#6b7280" font-family="monospace" font-size="10">{stats["xp"]:,} XP · {stats["wifi_discovered"]:,} WiFi · {stats["bt_discovered"]:,} BT · {stats["cell_discovered"]:,} Cell</text>
  <text x="16" y="108" fill="#4b5563" font-family="monospace" font-size="9">{earned_count} badges earned · {stats["total_uploads"]} uploads</text>
  <rect x="280" y="16" width="104" height="88" rx="4" fill="#0d937320" stroke="#0d9373" stroke-width="0.5"/>
  <text x="332" y="50" fill="#0d9373" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle">{stats["level"]}</text>
  <text x="332" y="68" fill="#6b7280" font-family="monospace" font-size="10" text-anchor="middle">LEVEL</text>
  <rect x="296" y="78" width="72" height="4" rx="2" fill="#374151"/>
  <rect x="296" y="78" width="{max(1, int(72 * stats['xp_progress'] / max(1, stats['xp_needed'])))}" height="4" rx="2" fill="#0d9373"/>
  <text x="332" y="96" fill="#4b5563" font-family="monospace" font-size="8" text-anchor="middle">{stats["xp_progress"]}/{stats["xp_needed"]} XP</text>
</svg>'''

    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=300"})


def _svg_escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
