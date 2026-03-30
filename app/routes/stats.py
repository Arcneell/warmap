from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_db, level_from_xp, xp_for_level, rank_title

router = APIRouter()


class ProfileCreate(BaseModel):
    pseudo: str


@router.get("/profile")
async def get_profile():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM profile WHERE id = 1")
        row = await cursor.fetchone()
        if row is None:
            return {"exists": False}
        xp = row["xp"]
        level = level_from_xp(xp)
        current_level_xp = xp_for_level(level)
        next_level_xp = xp_for_level(level + 1)
        return {
            "exists": True,
            "pseudo": row["pseudo"],
            "xp": xp,
            "level": level,
            "rank": rank_title(level),
            "xp_current_level": current_level_xp,
            "xp_next_level": next_level_xp,
            "xp_progress": xp - current_level_xp,
            "xp_needed": next_level_xp - current_level_xp,
            "created_at": row["created_at"],
        }
    finally:
        await db.close()


@router.post("/profile")
async def create_profile(body: ProfileCreate):
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT OR IGNORE INTO profile (id, pseudo, xp, created_at) VALUES (1, ?, 0, ?)",
            (body.pseudo.strip(), now),
        )
        await db.commit()
        return await get_profile()
    finally:
        await db.close()


@router.get("/stats")
async def get_stats():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as total FROM access_points")
        total = (await cursor.fetchone())["total"]

        cursor = await db.execute(
            "SELECT encryption, COUNT(*) as count FROM access_points GROUP BY encryption"
        )
        by_encryption = {row["encryption"]: row["count"] for row in await cursor.fetchall()}

        cursor = await db.execute(
            """SELECT ssid, COUNT(*) as count FROM access_points
            WHERE ssid != '' GROUP BY ssid ORDER BY count DESC LIMIT 10"""
        )
        top_ssids = [{"ssid": row["ssid"], "count": row["count"]} for row in await cursor.fetchall()]

        cursor = await db.execute("SELECT COUNT(*) as total FROM sessions")
        total_sessions = (await cursor.fetchone())["total"]

        cursor = await db.execute(
            "SELECT uploaded_at FROM sessions ORDER BY id DESC LIMIT 1"
        )
        last_row = await cursor.fetchone()
        last_session = last_row["uploaded_at"] if last_row else None

        return {
            "total_aps": total,
            "by_encryption": by_encryption,
            "top_ssids": top_ssids,
            "total_sessions": total_sessions,
            "last_session": last_session,
        }
    finally:
        await db.close()


@router.get("/sessions")
async def list_sessions():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM sessions ORDER BY id DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()
