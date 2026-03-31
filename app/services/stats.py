from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.transaction import UploadTransaction
from app.models.user import User
from app.services.xp import MAX_LEVEL, level_from_xp, rank_title, xp_for_level


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
    global_rank = (
        await db.scalar(select(func.count(User.id)).where(User.xp > user.xp))
        or 0
    ) + 1

    level = level_from_xp(user.xp)
    current_level_xp = xp_for_level(level)
    next_level_xp = xp_for_level(level + 1)
    if level >= MAX_LEVEL:
        next_level_xp = current_level_xp

    return {
        "user_id": user.id,
        "username": user.username,
        "xp": user.xp,
        "level": level,
        "rank": rank_title(level),
        "global_rank": global_rank,
        "wifi_discovered": wifi_discovered or 0,
        "bt_discovered": bt_discovered or 0,
        "cell_discovered": cell_discovered or 0,
        "total_uploads": total_uploads or 0,
        "xp_current_level": current_level_xp,
        "xp_next_level": next_level_xp,
        "xp_progress": 0 if level >= MAX_LEVEL else user.xp - current_level_xp,
        "xp_needed": 0 if level >= MAX_LEVEL else next_level_xp - current_level_xp,
    }


async def get_leaderboard(
    db: AsyncSession, sort_by: str = "xp", limit: int = 50, offset: int = 0
) -> list[dict]:
    wifi_sub = (
        select(WifiNetwork.discovered_by.label("user_id"), func.count(WifiNetwork.id).label("wifi_count"))
        .group_by(WifiNetwork.discovered_by)
        .subquery()
    )
    bt_sub = (
        select(BtNetwork.discovered_by.label("user_id"), func.count(BtNetwork.id).label("bt_count"))
        .group_by(BtNetwork.discovered_by)
        .subquery()
    )
    cell_sub = (
        select(CellTower.discovered_by.label("user_id"), func.count(CellTower.id).label("cell_count"))
        .group_by(CellTower.discovered_by)
        .subquery()
    )

    query = (
        select(
            User.id,
            User.username,
            User.avatar_url,
            User.xp,
            func.coalesce(wifi_sub.c.wifi_count, 0).label("wifi_discovered"),
            func.coalesce(bt_sub.c.bt_count, 0).label("bt_discovered"),
            func.coalesce(cell_sub.c.cell_count, 0).label("cell_discovered"),
        )
        .outerjoin(wifi_sub, wifi_sub.c.user_id == User.id)
        .outerjoin(bt_sub, bt_sub.c.user_id == User.id)
        .outerjoin(cell_sub, cell_sub.c.user_id == User.id)
    )

    if sort_by == "wifi":
        query = query.order_by(func.coalesce(wifi_sub.c.wifi_count, 0).desc(), User.xp.desc())
    else:
        query = query.order_by(User.xp.desc(), func.coalesce(wifi_sub.c.wifi_count, 0).desc())

    query = query.limit(limit).offset(offset)
    rows = (await db.execute(query)).all()

    entries = []
    for i, row in enumerate(rows):
        level = level_from_xp(row.xp)
        entries.append({
            "rank": offset + i + 1,
            "user_id": row.id,
            "username": row.username,
            "avatar_url": row.avatar_url,
            "wifi_discovered": row.wifi_discovered,
            "bt_discovered": row.bt_discovered,
            "cell_discovered": row.cell_discovered,
            "xp": row.xp,
            "level": level,
            "rank_title": rank_title(level),
        })
    return entries
