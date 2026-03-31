"""Badge evaluation engine.

Checks if a user qualifies for badges after actions (upload, etc.)
and awards them automatically.
"""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import BadgeDefinition, UserBadge
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.transaction import UploadTransaction
from app.models.user import User

logger = logging.getLogger(__name__)

# Badge seeds: slug, name, description, icon_emoji, category, tier, criteria_type, criteria_value
BADGE_SEEDS = [
    # --- WiFi milestones (8 tiers) ---
    {"slug": "wifi_10", "name": "First Steps", "description": "Discover 10 WiFi networks", "icon_emoji": "\ud83d\udce1", "category": "wifi", "tier": 1, "criteria_type": "wifi_count", "criteria_value": 10},
    {"slug": "wifi_100", "name": "Scanner", "description": "Discover 100 WiFi networks", "icon_emoji": "\ud83d\udce1", "category": "wifi", "tier": 2, "criteria_type": "wifi_count", "criteria_value": 100},
    {"slug": "wifi_500", "name": "Collector", "description": "Discover 500 WiFi networks", "icon_emoji": "\ud83d\udce1", "category": "wifi", "tier": 3, "criteria_type": "wifi_count", "criteria_value": 500},
    {"slug": "wifi_1000", "name": "Cartographer", "description": "Discover 1,000 WiFi networks", "icon_emoji": "\ud83d\uddfa\ufe0f", "category": "wifi", "tier": 4, "criteria_type": "wifi_count", "criteria_value": 1000},
    {"slug": "wifi_5000", "name": "Explorer", "description": "Discover 5,000 WiFi networks", "icon_emoji": "\ud83e\udded", "category": "wifi", "tier": 5, "criteria_type": "wifi_count", "criteria_value": 5000},
    {"slug": "wifi_10000", "name": "Wardriving Pro", "description": "Discover 10,000 WiFi networks", "icon_emoji": "\ud83d\ude80", "category": "wifi", "tier": 6, "criteria_type": "wifi_count", "criteria_value": 10000},
    {"slug": "wifi_50000", "name": "Spectrum Master", "description": "Discover 50,000 WiFi networks", "icon_emoji": "\ud83d\udc51", "category": "wifi", "tier": 7, "criteria_type": "wifi_count", "criteria_value": 50000},
    {"slug": "wifi_100000", "name": "Omniscient", "description": "Discover 100,000 WiFi networks", "icon_emoji": "\ud83d\udc41\ufe0f", "category": "wifi", "tier": 8, "criteria_type": "wifi_count", "criteria_value": 100000},
    # --- BT milestones (5 tiers) ---
    {"slug": "bt_10", "name": "Bluetooth Scout", "description": "Discover 10 Bluetooth devices", "icon_emoji": "\ud83d\udd35", "category": "bluetooth", "tier": 1, "criteria_type": "bt_count", "criteria_value": 10},
    {"slug": "bt_100", "name": "Bluetooth Hunter", "description": "Discover 100 Bluetooth devices", "icon_emoji": "\ud83d\udd35", "category": "bluetooth", "tier": 2, "criteria_type": "bt_count", "criteria_value": 100},
    {"slug": "bt_500", "name": "Bluetooth Stalker", "description": "Discover 500 Bluetooth devices", "icon_emoji": "\ud83d\udd35", "category": "bluetooth", "tier": 3, "criteria_type": "bt_count", "criteria_value": 500},
    {"slug": "bt_1000", "name": "Bluetooth Master", "description": "Discover 1,000 Bluetooth devices", "icon_emoji": "\ud83d\udd35", "category": "bluetooth", "tier": 4, "criteria_type": "bt_count", "criteria_value": 1000},
    {"slug": "bt_5000", "name": "Bluetooth Overlord", "description": "Discover 5,000 Bluetooth devices", "icon_emoji": "\ud83d\udd1e", "category": "bluetooth", "tier": 5, "criteria_type": "bt_count", "criteria_value": 5000},
    # --- Cell milestones (5 tiers) ---
    {"slug": "cell_10", "name": "Tower Spotter", "description": "Discover 10 cell towers", "icon_emoji": "\ud83d\udcf6", "category": "cell", "tier": 1, "criteria_type": "cell_count", "criteria_value": 10},
    {"slug": "cell_100", "name": "Tower Tracker", "description": "Discover 100 cell towers", "icon_emoji": "\ud83d\udcf6", "category": "cell", "tier": 2, "criteria_type": "cell_count", "criteria_value": 100},
    {"slug": "cell_500", "name": "Tower Climber", "description": "Discover 500 cell towers", "icon_emoji": "\ud83d\udcf6", "category": "cell", "tier": 3, "criteria_type": "cell_count", "criteria_value": 500},
    {"slug": "cell_1000", "name": "Infrastructure Mapper", "description": "Discover 1,000 cell towers", "icon_emoji": "\ud83c\udfd7\ufe0f", "category": "cell", "tier": 4, "criteria_type": "cell_count", "criteria_value": 1000},
    {"slug": "cell_5000", "name": "Grid Architect", "description": "Discover 5,000 cell towers", "icon_emoji": "\u26a1", "category": "cell", "tier": 5, "criteria_type": "cell_count", "criteria_value": 5000},
    # --- Upload milestones (6 tiers) ---
    {"slug": "upload_1", "name": "First Upload", "description": "Upload your first file", "icon_emoji": "\ud83d\udce4", "category": "upload", "tier": 1, "criteria_type": "upload_count", "criteria_value": 1},
    {"slug": "upload_10", "name": "Regular Contributor", "description": "Upload 10 files", "icon_emoji": "\ud83d\udce4", "category": "upload", "tier": 2, "criteria_type": "upload_count", "criteria_value": 10},
    {"slug": "upload_25", "name": "Dedicated Scanner", "description": "Upload 25 files", "icon_emoji": "\ud83d\udce4", "category": "upload", "tier": 3, "criteria_type": "upload_count", "criteria_value": 25},
    {"slug": "upload_50", "name": "Data Provider", "description": "Upload 50 files", "icon_emoji": "\ud83d\udcbe", "category": "upload", "tier": 4, "criteria_type": "upload_count", "criteria_value": 50},
    {"slug": "upload_100", "name": "Data Legend", "description": "Upload 100 files", "icon_emoji": "\ud83c\udfc6", "category": "upload", "tier": 5, "criteria_type": "upload_count", "criteria_value": 100},
    {"slug": "upload_500", "name": "Data God", "description": "Upload 500 files", "icon_emoji": "\ud83d\udc8e", "category": "upload", "tier": 6, "criteria_type": "upload_count", "criteria_value": 500},
    # --- XP milestones (6 tiers) ---
    {"slug": "xp_100", "name": "Newbie", "description": "Earn 100 XP", "icon_emoji": "\u2b50", "category": "xp", "tier": 1, "criteria_type": "xp", "criteria_value": 100},
    {"slug": "xp_1000", "name": "Experienced", "description": "Earn 1,000 XP", "icon_emoji": "\u2b50", "category": "xp", "tier": 2, "criteria_type": "xp", "criteria_value": 1000},
    {"slug": "xp_5000", "name": "Seasoned", "description": "Earn 5,000 XP", "icon_emoji": "\ud83c\udf1f", "category": "xp", "tier": 3, "criteria_type": "xp", "criteria_value": 5000},
    {"slug": "xp_10000", "name": "Veteran", "description": "Earn 10,000 XP", "icon_emoji": "\ud83c\udf1f", "category": "xp", "tier": 4, "criteria_type": "xp", "criteria_value": 10000},
    {"slug": "xp_50000", "name": "Elite", "description": "Earn 50,000 XP", "icon_emoji": "\ud83d\udd25", "category": "xp", "tier": 5, "criteria_type": "xp", "criteria_value": 50000},
    {"slug": "xp_100000", "name": "Transcendent", "description": "Earn 100,000 XP", "icon_emoji": "\u2604\ufe0f", "category": "xp", "tier": 6, "criteria_type": "xp", "criteria_value": 100000},
    # --- Level milestones (5 tiers) ---
    {"slug": "level_5", "name": "Signal Hunter", "description": "Reach level 5", "icon_emoji": "\ud83c\udfaf", "category": "level", "tier": 1, "criteria_type": "level", "criteria_value": 5},
    {"slug": "level_10", "name": "RF Scout", "description": "Reach level 10", "icon_emoji": "\ud83c\udfaf", "category": "level", "tier": 2, "criteria_type": "level", "criteria_value": 10},
    {"slug": "level_25", "name": "Wave Rider", "description": "Reach level 25", "icon_emoji": "\ud83c\udfc4", "category": "level", "tier": 3, "criteria_type": "level", "criteria_value": 25},
    {"slug": "level_50", "name": "Frequency Ghost", "description": "Reach level 50", "icon_emoji": "\ud83d\udc7b", "category": "level", "tier": 4, "criteria_type": "level", "criteria_value": 50},
    {"slug": "level_100", "name": "Omniscient Eye", "description": "Reach max level 100", "icon_emoji": "\ud83d\udd2e", "category": "level", "tier": 5, "criteria_type": "level", "criteria_value": 100},
    # --- Special / Encryption badges ---
    {"slug": "wep_hunter", "name": "WEP Hunter", "description": "Discover 10 WEP networks (ancient relics!)", "icon_emoji": "\ud83d\udd13", "category": "special", "tier": 1, "criteria_type": "wep_count", "criteria_value": 10},
    {"slug": "wep_archaeologist", "name": "WEP Archaeologist", "description": "Discover 100 WEP networks", "icon_emoji": "\ud83e\udeb6", "category": "special", "tier": 2, "criteria_type": "wep_count", "criteria_value": 100},
    {"slug": "open_spotter", "name": "Open Spotter", "description": "Discover 50 open networks", "icon_emoji": "\ud83d\udd13", "category": "special", "tier": 1, "criteria_type": "open_count", "criteria_value": 50},
    {"slug": "wpa3_pioneer", "name": "WPA3 Pioneer", "description": "Discover 50 WPA3 networks", "icon_emoji": "\ud83d\udee1\ufe0f", "category": "special", "tier": 1, "criteria_type": "wpa3_count", "criteria_value": 50},
    {"slug": "wpa3_evangelist", "name": "WPA3 Evangelist", "description": "Discover 500 WPA3 networks", "icon_emoji": "\ud83d\udee1\ufe0f", "category": "special", "tier": 2, "criteria_type": "wpa3_count", "criteria_value": 500},
]


async def seed_badges(db: AsyncSession):
    """Insert or update badge definitions."""
    for badge_data in BADGE_SEEDS:
        existing = await db.execute(
            select(BadgeDefinition).where(BadgeDefinition.slug == badge_data["slug"])
        )
        badge = existing.scalar_one_or_none()
        if badge:
            # Update existing badge with new fields
            for key, value in badge_data.items():
                if key != "slug":
                    setattr(badge, key, value)
        else:
            db.add(BadgeDefinition(**badge_data))
    await db.commit()


async def evaluate_badges(db: AsyncSession, user: User) -> list[str]:
    """Check all badge criteria for a user and award any newly earned badges.

    Returns list of newly awarded badge slugs.
    """
    from app.services.xp import level_from_xp

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

    # Encryption-specific counts
    wep_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(
            WifiNetwork.discovered_by == user.id,
            WifiNetwork.encryption == "WEP",
        )
    ) or 0
    open_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(
            WifiNetwork.discovered_by == user.id,
            WifiNetwork.encryption == "Open",
        )
    ) or 0
    wpa3_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(
            WifiNetwork.discovered_by == user.id,
            WifiNetwork.encryption == "WPA3",
        )
    ) or 0

    user_values = {
        "wifi_count": wifi_count,
        "bt_count": bt_count,
        "cell_count": cell_count,
        "upload_count": upload_count,
        "xp": user.xp,
        "level": level_from_xp(user.xp),
        "wep_count": wep_count,
        "open_count": open_count,
        "wpa3_count": wpa3_count,
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
        logger.info("User %s earned badges: %s", user.id, newly_awarded)

    return newly_awarded


async def get_user_badges(db: AsyncSession, user_id: int) -> list[dict]:
    """Get all badges for a user, including unearned ones (grayed out)."""
    result = await db.execute(
        select(BadgeDefinition).order_by(BadgeDefinition.category, BadgeDefinition.tier)
    )
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
            "icon_emoji": b.icon_emoji,
            "category": b.category,
            "tier": b.tier,
            "criteria_type": b.criteria_type,
            "criteria_value": b.criteria_value,
            "earned": b.id in earned,
            "earned_at": earned[b.id].isoformat() if b.id in earned else None,
        })
    return badges
