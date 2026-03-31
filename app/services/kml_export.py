"""KML export service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import WifiNetwork
from app.models.transaction import UploadTransaction


async def export_kml(
    db: AsyncSession,
    user_id: int | None = None,
    transaction_id: int | None = None,
) -> str:
    """Generate KML from WiFi networks."""
    query = select(WifiNetwork)
    if user_id is not None:
        query = query.where(WifiNetwork.discovered_by == user_id)
    if transaction_id is not None:
        from app.models.observation import WifiObservation
        subq = select(WifiObservation.network_id).where(
            WifiObservation.transaction_id == transaction_id
        ).distinct()
        query = query.where(WifiNetwork.id.in_(subq))

    query = query.order_by(WifiNetwork.first_seen)
    result = await db.execute(query)
    networks = result.scalars().all()

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        '<Document>',
        '<name>Wardrove Export</name>',
        '<description>WiFi networks exported from Wardrove</description>',
        _style("wpa3", "ff73930d"), _style("wpa2", "fff6823b"),
        _style("wpa", "ff3278e0"), _style("wep", "ff4535dc"),
        _style("open", "ff9fa39c"), _style("unknown", "ffdbd5d1"),
    ]

    for net in networks:
        if net.latitude is None or net.longitude is None:
            continue
        enc_lower = (net.encryption or "unknown").lower()
        style = f"#style_{enc_lower}" if enc_lower in ("wpa3", "wpa2", "wpa", "wep", "open") else "#style_unknown"
        lines.append(f"""<Placemark>
<name>{_xml_escape(net.ssid or net.bssid)}</name>
<description>BSSID: {_xml_escape(net.bssid)}
Encryption: {net.encryption}
Channel: {net.channel}
Signal: {net.rssi} dBm
First seen: {net.first_seen.isoformat() if net.first_seen else ''}
Last seen: {net.last_seen.isoformat() if net.last_seen else ''}</description>
<styleUrl>{style}</styleUrl>
<Point><coordinates>{net.longitude},{net.latitude},{net.altitude or 0}</coordinates></Point>
</Placemark>""")

    lines.extend(['</Document>', '</kml>'])
    return '\n'.join(lines)


def _style(name: str, color: str) -> str:
    return f"""<Style id="style_{name}">
<IconStyle><color>{color}</color><scale>0.8</scale>
<Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href></Icon>
</IconStyle></Style>"""


def _xml_escape(text: str) -> str:
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
