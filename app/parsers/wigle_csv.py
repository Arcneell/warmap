import csv
import io
import re
from datetime import datetime

from app.parsers.base import BaseParser, NetworkObservation


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
    if re.search(r"\[", auth_mode):
        return "Open"
    return "Unknown"


def _parse_datetime(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S%z"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    return None


class WigleCsvParser(BaseParser):
    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        text = content.decode("utf-8", errors="replace")
        lines = text.strip().splitlines()
        if len(lines) < 3:
            return []

        header_line = lines[1]
        data_lines = lines[2:]

        reader = csv.DictReader(io.StringIO(header_line + "\n" + "\n".join(data_lines)))

        observations = []
        for row in reader:
            try:
                lat = float(row.get("CurrentLatitude", 0) or 0)
                lon = float(row.get("CurrentLongitude", 0) or 0)
                if lat == 0.0 and lon == 0.0:
                    continue

                bssid = (row.get("MAC", "") or "").strip().upper()
                if not bssid:
                    continue

                ssid = (row.get("SSID", "") or "").strip()
                auth_mode = (row.get("AuthMode", "") or "").strip()
                encryption = classify_encryption(auth_mode)
                channel = int(row.get("Channel", 0) or 0)
                frequency = int(row.get("Frequency", 0) or 0)
                rssi = int(row.get("RSSI", -100) or -100)
                first_seen = (row.get("FirstSeen", "") or "").strip()
                device_type = (row.get("Type", "WIFI") or "WIFI").strip().upper()
                altitude = float(row.get("AltitudeMeters", 0) or 0) or None
                accuracy = float(row.get("AccuracyMeters", 0) or 0) or None

                # Map device type to our network types
                if device_type in ("BT", "BLE"):
                    net_type = device_type.lower()
                elif device_type in ("GSM", "LTE", "CDMA", "WCDMA", "NR"):
                    net_type = "cell"
                else:
                    net_type = "wifi"

                obs = NetworkObservation(
                    network_type=net_type,
                    identifier=bssid,
                    name=ssid,
                    encryption=encryption if net_type == "wifi" else None,
                    channel=channel if net_type == "wifi" else None,
                    frequency=frequency if net_type == "wifi" else None,
                    rssi=rssi,
                    latitude=lat,
                    longitude=lon,
                    altitude=altitude,
                    accuracy=accuracy,
                    seen_at=_parse_datetime(first_seen),
                )

                # Cell-specific fields
                # WiGLE CSV for cell towers:
                #   MAC = composite like "310_260_12345_67890" or "MCC_MNC_LAC_CID"
                #   SSID = operator name
                #   AuthMode = empty or radio type
                #   Channel = may contain LAC or ARFCN
                if net_type == "cell":
                    obs.radio = device_type
                    cell_parts = bssid.replace(":", "_").replace("-", "_").split("_")
                    if len(cell_parts) >= 4:
                        try:
                            obs.mcc = int(cell_parts[0])
                            obs.mnc = int(cell_parts[1])
                            obs.lac = int(cell_parts[2])
                            obs.cid = int(cell_parts[3])
                        except (ValueError, IndexError):
                            pass
                    elif len(cell_parts) >= 2:
                        try:
                            obs.mcc = int(cell_parts[0])
                            obs.mnc = int(cell_parts[1])
                            obs.cid = channel or 0
                        except (ValueError, IndexError):
                            pass

                observations.append(obs)
            except (ValueError, KeyError):
                continue

        return observations
