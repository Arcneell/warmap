from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.transaction import UploadTransaction
from app.models.user import User
from app.services.xp import level_from_xp, rank_title, xp_for_level


async def get_global_stats(db: AsyncSession) -> dict:
    wifi_total = await db.scalar(select(func.count(WifiNetwork.id)))
    bt_total = await db.scalar(select(func.count(BtNetwork.id)))
    cell_total = await db.scalar(select(func.count(CellTower.id)))
    user_total = await db.scalar(select(func.count(User.id)))
    upload_total = await db.scalar(select(func.count(UploadTransaction.id)))

    enc_result = await db.execute(
        select(WifiNetwork.encryption, func.count(WifiNetwork.id))
        .group_by(WifiNetwork.encryption)
    )
    by_encryption = {row[0]: row[1] for row in enc_result.all()}

    top_ssids_result = await db.execute(
        select(WifiNetwork.ssid, func.count(WifiNetwork.id).label("count"))
        .where(WifiNetwork.ssid != "")
        .group_by(WifiNetwork.ssid)
        .order_by(func.count(WifiNetwork.id).desc())
        .limit(10)
    )
    top_ssids = [{"ssid": row[0], "count": row[1]} for row in top_ssids_result.all()]

    return {
        "total_wifi": wifi_total or 0,
        "total_bt": bt_total or 0,
        "total_cell": cell_total or 0,
        "total_users": user_total or 0,
        "total_uploads": upload_total or 0,
        "by_encryption": by_encryption,
        "top_ssids": top_ssids,
    }


async def get_user_stats(db: AsyncSession, user: User) -> dict:
    wifi_discovered = await db.scalar(
        select(func.count(WifiNetwork.id)).where(WifiNetwork.discovered_by == user.id)
    )
    bt_discovered = await db.scalar(
        select(func.count(BtNetwork.id)).where(BtNetwork.discovered_by == user.id)
    )
    cell_discovered = await db.scalar(
        select(func.count(CellTower.id)).where(CellTower.discovered_by == user.id)
    )
    total_uploads = await db.scalar(
        select(func.count(UploadTransaction.id)).where(
            UploadTransaction.user_id == user.id
        )
    )

    level = level_from_xp(user.xp)
    current_level_xp = xp_for_level(level)
    next_level_xp = xp_for_level(level + 1)

    return {
        "user_id": user.id,
        "username": user.username,
        "xp": user.xp,
        "level": level,
        "rank": rank_title(level),
        "wifi_discovered": wifi_discovered or 0,
        "bt_discovered": bt_discovered or 0,
        "cell_discovered": cell_discovered or 0,
        "total_uploads": total_uploads or 0,
        "xp_current_level": current_level_xp,
        "xp_next_level": next_level_xp,
        "xp_progress": user.xp - current_level_xp,
        "xp_needed": next_level_xp - current_level_xp,
    }


async def get_leaderboard(
    db: AsyncSession, sort_by: str = "xp", limit: int = 50, offset: int = 0
) -> list[dict]:
    sort_column = {
        "xp": User.xp,
        "wifi": func.count(WifiNetwork.id),
    }.get(sort_by, User.xp)

    if sort_by == "wifi":
        query = (
            select(
                User.id,
                User.username,
                User.avatar_url,
                User.xp,
                func.count(WifiNetwork.id).label("wifi_discovered"),
            )
            .outerjoin(WifiNetwork, WifiNetwork.discovered_by == User.id)
            .group_by(User.id)
            .order_by(func.count(WifiNetwork.id).desc())
            .limit(limit)
            .offset(offset)
        )
    else:
        query = (
            select(User)
            .order_by(User.xp.desc())
            .limit(limit)
            .offset(offset)
        )

    result = await db.execute(query)
    entries = []

    if sort_by == "wifi":
        for i, row in enumerate(result.all()):
            level = level_from_xp(row.xp)
            entries.append({
                "rank": offset + i + 1,
                "user_id": row.id,
                "username": row.username,
                "avatar_url": row.avatar_url,
                "wifi_discovered": row.wifi_discovered,
                "bt_discovered": 0,
                "cell_discovered": 0,
                "xp": row.xp,
                "level": level,
            })
    else:
        for i, user in enumerate(result.scalars().all()):
            level = level_from_xp(user.xp)
            entries.append({
                "rank": offset + i + 1,
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "wifi_discovered": 0,
                "bt_discovered": 0,
                "cell_discovered": 0,
                "xp": user.xp,
                "level": level,
            })

    return entries
