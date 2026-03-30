from datetime import datetime, timezone

from fastapi import APIRouter, File, UploadFile

from app.database import get_db, XP_PER_IMPORT, XP_PER_UPDATE, XP_PER_SESSION
from app.parser import parse_wigle_csv

router = APIRouter()


@router.post("/upload")
async def upload_csv(files: list[UploadFile] = File(...)):
    db = await get_db()
    try:
        results = []
        total_xp = 0

        for file in files:
            content = (await file.read()).decode("utf-8", errors="replace")
            access_points = parse_wigle_csv(content)

            now = datetime.now(timezone.utc).isoformat()
            cursor = await db.execute(
                "INSERT INTO sessions (filename, uploaded_at) VALUES (?, ?)",
                (file.filename, now),
            )
            session_id = cursor.lastrowid

            imported = 0
            updated = 0
            skipped = 0
            wifi_imported = 0

            for ap in access_points:
                existing = await db.execute(
                    "SELECT id, rssi, ssid, encryption, last_seen FROM access_points WHERE bssid = ?",
                    (ap["bssid"],),
                )
                row = await existing.fetchone()

                if row is None:
                    await db.execute(
                        """INSERT INTO access_points
                        (bssid, ssid, encryption, channel, rssi, latitude, longitude,
                         first_seen, last_seen, device_type, session_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            ap["bssid"], ap["ssid"], ap["encryption"], ap["channel"],
                            ap["rssi"], ap["latitude"], ap["longitude"],
                            ap["first_seen"], ap["last_seen"], ap["device_type"],
                            session_id,
                        ),
                    )
                    imported += 1
                    if ap["device_type"] == "WIFI":
                        wifi_imported += 1
                else:
                    updates = {}
                    old_rssi = row["rssi"]
                    old_ssid = row["ssid"]
                    old_enc = row["encryption"]
                    old_last_seen = row["last_seen"]

                    if ap["rssi"] > old_rssi:
                        updates["rssi"] = ap["rssi"]
                        updates["latitude"] = ap["latitude"]
                        updates["longitude"] = ap["longitude"]

                    if ap["last_seen"] > old_last_seen:
                        updates["last_seen"] = ap["last_seen"]

                    if not old_ssid and ap["ssid"]:
                        updates["ssid"] = ap["ssid"]

                    if old_enc == "Unknown" and ap["encryption"] != "Unknown":
                        updates["encryption"] = ap["encryption"]

                    if updates:
                        set_clause = ", ".join(f"{k} = ?" for k in updates)
                        values = list(updates.values()) + [row["id"]]
                        await db.execute(
                            f"UPDATE access_points SET {set_clause} WHERE id = ?",
                            values,
                        )
                        updated += 1
                    else:
                        skipped += 1

            xp_earned = (wifi_imported * XP_PER_IMPORT) + XP_PER_SESSION
            total_xp += xp_earned

            await db.execute(
                "UPDATE sessions SET ap_imported = ?, ap_updated = ?, ap_skipped = ?, xp_earned = ? WHERE id = ?",
                (imported, updated, skipped, xp_earned, session_id),
            )

            results.append({
                "session_id": session_id,
                "filename": file.filename,
                "imported": imported,
                "updated": updated,
                "skipped": skipped,
                "xp_earned": xp_earned,
            })

        # Add total XP to profile
        if total_xp > 0:
            await db.execute("UPDATE profile SET xp = xp + ? WHERE id = 1", (total_xp,))

        await db.commit()

        return {
            "files": results,
            "total_imported": sum(r["imported"] for r in results),
            "total_updated": sum(r["updated"] for r in results),
            "total_skipped": sum(r["skipped"] for r in results),
            "total_xp_earned": total_xp,
        }
    finally:
        await db.close()
