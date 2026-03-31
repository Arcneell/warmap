"""Badge evaluation engine.

Checks if a user qualifies for badges after actions (upload, etc.)
and awards them automatically.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import BadgeDefinition, UserBadge
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.transaction import UploadTransaction
from app.models.user import User

# Seed badge definitions (inserted on first run)
BADGE_SEEDS = [
    # WiFi milestones
    {"slug": "wifi_10", "name": "First Steps", "description": "Discover 10 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 10},
    {"slug": "wifi_100", "name": "Scanner", "description": "Discover 100 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 100},
    {"slug": "wifi_500", "name": "Collector", "description": "Discover 500 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 500},
    {"slug": "wifi_1000", "name": "Cartographer", "description": "Discover 1,000 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 1000},
    {"slug": "wifi_5000", "name": "Explorer", "description": "Discover 5,000 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 5000},
    {"slug": "wifi_10000", "name": "Wardriving Pro", "description": "Discover 10,000 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 10000},
    {"slug": "wifi_50000", "name": "Spectrum Master", "description": "Discover 50,000 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 50000},
    {"slug": "wifi_100000", "name": "Omniscient", "description": "Discover 100,000 WiFi networks", "criteria_type": "wifi_count", "criteria_value": 100000},
    # BT milestones
    {"slug": "bt_10", "name": "Bluetooth Scout", "description": "Discover 10 Bluetooth devices", "criteria_type": "bt_count", "criteria_value": 10},
    {"slug": "bt_100", "name": "Bluetooth Hunter", "description": "Discover 100 Bluetooth devices", "criteria_type": "bt_count", "criteria_value": 100},
    {"slug": "bt_1000", "name": "Bluetooth Master", "description": "Discover 1,000 Bluetooth devices", "criteria_type": "bt_count", "criteria_value": 1000},
    # Cell milestones
    {"slug": "cell_10", "name": "Tower Spotter", "description": "Discover 10 cell towers", "criteria_type": "cell_count", "criteria_value": 10},
    {"slug": "cell_100", "name": "Tower Tracker", "description": "Discover 100 cell towers", "criteria_type": "cell_count", "criteria_value": 100},
    {"slug": "cell_1000", "name": "Infrastructure Mapper", "description": "Discover 1,000 cell towers", "criteria_type": "cell_count", "criteria_value": 1000},
    # Upload milestones
    {"slug": "upload_1", "name": "First Upload", "description": "Upload your first file", "criteria_type": "upload_count", "criteria_value": 1},
    {"slug": "upload_10", "name": "Regular Contributor", "description": "Upload 10 files", "criteria_type": "upload_count", "criteria_value": 10},
    {"slug": "upload_50", "name": "Data Provider", "description": "Upload 50 files", "criteria_type": "upload_count", "criteria_value": 50},
    {"slug": "upload_100", "name": "Data Legend", "description": "Upload 100 files", "criteria_type": "upload_count", "criteria_value": 100},
    # XP milestones
    {"slug": "xp_100", "name": "Newbie", "description": "Earn 100 XP", "criteria_type": "xp", "criteria_value": 100},
    {"slug": "xp_1000", "name": "Experienced", "description": "Earn 1,000 XP", "criteria_type": "xp", "criteria_value": 1000},
    {"slug": "xp_10000", "name": "Veteran", "description": "Earn 10,000 XP", "criteria_type": "xp", "criteria_value": 10000},
    {"slug": "xp_50000", "name": "Elite", "description": "Earn 50,000 XP", "criteria_type": "xp", "criteria_value": 50000},
]


async def seed_badges(db: AsyncSession):
    """Insert badge definitions if they don't exist."""
    for badge_data in BADGE_SEEDS:
        existing = await db.execute(
            select(BadgeDefinition).where(BadgeDefinition.slug == badge_data["slug"])
        )
        if not existing.scalar_one_or_none():
            db.add(BadgeDefinition(**badge_data))
    await db.commit()


async def evaluate_badges(db: AsyncSession, user: User) -> list[str]:
    """Check all badge criteria for a user and award any newly earned badges.

    Returns list of newly awarded badge slugs.
    """
    # Get user's current badges
    result = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user.id)
    )
    owned_badge_ids = {row[0] for row in result.all()}

    # Get all badge definitions
    result = await db.execute(select(BadgeDefinition))
    all_badges = result.scalars().all()

    # Get user stats
    wifi_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(WifiNetwork.discovered_by == user.id)
    ) or 0
    bt_count = await db.scalar(
        select(func.count(BtNetwork.id)).where(BtNetwork.discovered_by == user.id)
    ) or 0
    cell_count = await db.scalar(
        select(func.count(CellTower.id)).where(CellTower.discovered_by == user.id)
    ) or 0
    upload_count = await db.scalar(
        select(func.count(UploadTransaction.id)).where(
            UploadTransaction.user_id == user.id,
            UploadTransaction.status == "done",
        )
    ) or 0

    user_values = {
        "wifi_count": wifi_count,
        "bt_count": bt_count,
        "cell_count": cell_count,
        "upload_count": upload_count,
        "xp": user.xp,
    }

    newly_awarded = []
    for badge in all_badges:
        if badge.id in owned_badge_ids:
            continue
        if not badge.criteria_type or badge.criteria_value is None:
            continue

        current_value = user_values.get(badge.criteria_type, 0)
        if current_value >= badge.criteria_value:
            db.add(UserBadge(user_id=user.id, badge_id=badge.id))
            newly_awarded.append(badge.slug)

    if newly_awarded:
        await db.commit()

    return newly_awarded


async def get_user_badges(db: AsyncSession, user_id: int) -> list[dict]:
    """Get all badges for a user, including unearned ones (grayed out)."""
    result = await db.execute(select(BadgeDefinition).order_by(BadgeDefinition.id))
    all_badges = result.scalars().all()

    result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user_id)
    )
    earned = {ub.badge_id: ub.earned_at for ub in result.scalars().all()}

    badges = []
    for b in all_badges:
        badges.append({
            "id": b.id,
            "slug": b.slug,
            "name": b.name,
            "description": b.description,
            "criteria_type": b.criteria_type,
            "criteria_value": b.criteria_value,
            "earned": b.id in earned,
            "earned_at": earned[b.id].isoformat() if b.id in earned else None,
        })
    return badges
