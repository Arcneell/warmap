import csv
import io
import re


def classify_encryption(auth_mode: str) -> str:
    if not auth_mode or not auth_mode.strip():
        return "Unknown"
    upper = auth_mode.upper()
    if "WPA3" in upper or "SAE" in upper:
        return "WPA3"
    if "WPA2" in upper or "RSN" in upper:
        return "WPA2"
    if "WPA" in upper:
        return "WPA"
    if "WEP" in upper:
        return "WEP"
    # Only tags like [ESS], [IBSS] or similar
    if re.search(r'\[', auth_mode):
        return "Open"
    return "Unknown"


def parse_wigle_csv(content: str) -> list[dict]:
    """Parse WiGLE CSV v1.6 content and return list of AP dicts."""
    lines = content.strip().splitlines()
    if len(lines) < 3:
        return []

    # Line 1: WiGLE header metadata - skip
    # Line 2: column names
    # Lines 3+: data
    header_line = lines[1]
    data_lines = lines[2:]

    reader = csv.DictReader(io.StringIO(header_line + "\n" + "\n".join(data_lines)))

    access_points = []
    for row in reader:
        try:
            lat = float(row.get("CurrentLatitude", 0) or 0)
            lon = float(row.get("CurrentLongitude", 0) or 0)

            # Skip entries with no GPS fix
            if lat == 0.0 and lon == 0.0:
                continue

            bssid = (row.get("MAC", "") or "").strip().upper()
            if not bssid:
                continue

            ssid = (row.get("SSID", "") or "").strip()
            auth_mode = (row.get("AuthMode", "") or "").strip()
            encryption = classify_encryption(auth_mode)
            channel = int(row.get("Channel", 0) or 0)
            rssi = int(row.get("RSSI", -100) or -100)
            first_seen = (row.get("FirstSeen", "") or "").strip()
            device_type = (row.get("Type", "WIFI") or "WIFI").strip()

            access_points.append({
                "bssid": bssid,
                "ssid": ssid,
                "encryption": encryption,
                "channel": channel,
                "rssi": rssi,
                "latitude": lat,
                "longitude": lon,
                "first_seen": first_seen,
                "last_seen": first_seen,
                "device_type": device_type,
            })
        except (ValueError, KeyError):
            continue

    return access_points
