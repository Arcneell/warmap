import csv
import io

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import WifiNetwork


ENC_TO_AUTH = {
    "WPA3": "[WPA3-SAE][ESS]",
    "WPA2": "[WPA2-PSK-CCMP][ESS]",
    "WPA": "[WPA-PSK-TKIP][ESS]",
    "WEP": "[WEP][ESS]",
    "Open": "[ESS]",
    "Unknown": "",
}


async def export_wigle_csv(db: AsyncSession, user_id: int | None = None) -> str:
    query = select(WifiNetwork).order_by(WifiNetwork.first_seen)
    if user_id is not None:
        query = query.where(WifiNetwork.discovered_by == user_id)

    result = await db.execute(query)
    networks = result.scalars().all()

    output = io.StringIO()
    output.write(
        "WigleWifi-1.6,appRelease=wardrove,model=export,release=1.0,"
        "device=wardrove,display=web,board=server,brand=wardrove\n"
    )

    writer = csv.writer(output)
    writer.writerow([
        "MAC", "SSID", "AuthMode", "FirstSeen", "Channel", "RSSI",
        "CurrentLatitude", "CurrentLongitude", "AltitudeMeters",
        "AccuracyMeters", "Type",
    ])

    for net in networks:
        auth = ENC_TO_AUTH.get(net.encryption, "")
        writer.writerow([
            net.bssid, net.ssid, auth, net.first_seen.isoformat(),
            net.channel, net.rssi, net.latitude, net.longitude,
            net.altitude or 0.0, net.accuracy or 0.0, "WIFI",
        ])

    output.seek(0)
    return output.getvalue()


async def export_geojson(
    db: AsyncSession,
    lat_min: float | None = None,
    lat_max: float | None = None,
    lon_min: float | None = None,
    lon_max: float | None = None,
    encryption: str | None = None,
    ssid: str | None = None,
    discovered_by: int | None = None,
    limit: int = 10000,
) -> dict:
    query = select(WifiNetwork)

    if lat_min is not None:
        query = query.where(WifiNetwork.latitude >= lat_min)
    if lat_max is not None:
        query = query.where(WifiNetwork.latitude <= lat_max)
    if lon_min is not None:
        query = query.where(WifiNetwork.longitude >= lon_min)
    if lon_max is not None:
        query = query.where(WifiNetwork.longitude <= lon_max)
    if encryption:
        enc_list = [e.strip() for e in encryption.split(",")]
        query = query.where(WifiNetwork.encryption.in_(enc_list))
    if ssid:
        query = query.where(WifiNetwork.ssid.ilike(f"%{ssid}%"))
    if discovered_by is not None:
        query = query.where(WifiNetwork.discovered_by == discovered_by)

    query = query.limit(limit)

    result = await db.execute(query)
    networks = result.scalars().all()

    features = []
    for net in networks:
        if net.latitude is None or net.longitude is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [net.longitude, net.latitude],
            },
            "properties": {
                "id": net.id,
                "bssid": net.bssid,
                "ssid": net.ssid,
                "encryption": net.encryption,
                "channel": net.channel,
                "rssi": net.rssi,
                "first_seen": net.first_seen.isoformat() if net.first_seen else None,
                "last_seen": net.last_seen.isoformat() if net.last_seen else None,
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "truncated": len(networks) >= limit,
    }
