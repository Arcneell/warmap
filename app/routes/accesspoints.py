from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.database import get_db

router = APIRouter()


@router.get("/accesspoints")
async def list_accesspoints(
    encryption: str | None = Query(None),
    ssid: str | None = Query(None),
    limit: int = Query(100, ge=1, le=10000),
    offset: int = Query(0, ge=0),
):
    db = await get_db()
    try:
        conditions = []
        params = []

        if encryption:
            conditions.append("encryption = ?")
            params.append(encryption)
        if ssid:
            conditions.append("ssid LIKE ?")
            params.append(f"%{ssid}%")

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f"SELECT * FROM access_points {where} ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


@router.get("/accesspoints/geojson")
async def geojson(
    encryption: str | None = Query(None),
    ssid: str | None = Query(None),
):
    db = await get_db()
    try:
        conditions = []
        params = []

        if encryption:
            enc_list = encryption.split(",")
            placeholders = ",".join("?" for _ in enc_list)
            conditions.append(f"encryption IN ({placeholders})")
            params.extend(enc_list)
        if ssid:
            conditions.append("ssid LIKE ?")
            params.append(f"%{ssid}%")

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        query = f"SELECT * FROM access_points {where}"

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()

        features = []
        for row in rows:
            r = dict(row)
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [r["longitude"], r["latitude"]],
                },
                "properties": {
                    "id": r["id"],
                    "bssid": r["bssid"],
                    "ssid": r["ssid"],
                    "encryption": r["encryption"],
                    "channel": r["channel"],
                    "rssi": r["rssi"],
                    "first_seen": r["first_seen"],
                    "last_seen": r["last_seen"],
                    "device_type": r["device_type"],
                },
            })

        return {
            "type": "FeatureCollection",
            "features": features,
        }
    finally:
        await db.close()


@router.delete("/accesspoints/{ap_id}")
async def delete_accesspoint(ap_id: int):
    db = await get_db()
    try:
        await db.execute("DELETE FROM access_points WHERE id = ?", (ap_id,))
        await db.commit()
        return JSONResponse(status_code=204, content=None)
    finally:
        await db.close()
