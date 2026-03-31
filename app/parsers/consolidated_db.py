"""iOS Consolidated.db (CellLocation/WiFiLocation) parser.

Legacy iOS devices stored WiFi and cell location data in a SQLite
database at /var/root/Library/Caches/locationd/consolidated.db
"""

import sqlite3
import tempfile
import os
from datetime import datetime, timezone

from app.parsers.base import BaseParser, NetworkObservation


# Apple epoch: 2001-01-01 00:00:00 UTC
APPLE_EPOCH = datetime(2001, 1, 1, tzinfo=timezone.utc)


def _apple_timestamp_to_datetime(ts: float) -> datetime:
    """Convert Apple Core Data timestamp to Python datetime."""
    if ts is None or ts == 0:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromtimestamp(
            APPLE_EPOCH.timestamp() + ts, tz=timezone.utc
        )
    except (OSError, OverflowError, ValueError):
        return datetime.now(timezone.utc)


class ConsolidatedDbParser(BaseParser):
    """Parse iOS consolidated.db SQLite files."""

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        observations = []

        # Write to temp file since sqlite3 needs a file path
        fd, tmp_path = tempfile.mkstemp(suffix=".db")
        try:
            os.write(fd, content)
            os.close(fd)

            conn = sqlite3.connect(tmp_path)
            conn.row_factory = sqlite3.Row

            # Try WiFi location table
            observations.extend(self._parse_wifi(conn))

            # Try Cell location table
            observations.extend(self._parse_cell(conn))

            conn.close()
        except sqlite3.DatabaseError:
            pass
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

        return observations

    def _parse_wifi(self, conn: sqlite3.Connection) -> list[NetworkObservation]:
        observations = []

        # Try different table names used across iOS versions
        wifi_tables = [
            "WifiLocation",
            "WiFiLocation",
            "wifi",
        ]

        for table in wifi_tables:
            try:
                cursor = conn.execute(f"SELECT * FROM {table}")
                columns = [desc[0].lower() for desc in cursor.description]
                break
            except sqlite3.OperationalError:
                continue
        else:
            return []

        def get_col(row, names):
            for name in names:
                if name in columns:
                    idx = columns.index(name)
                    return row[idx]
            return None

        for row in cursor:
            try:
                mac = get_col(row, ['mac', 'bssid', 'address'])
                if not mac:
                    continue
                mac = str(mac).strip().upper()
                if len(mac) < 11:
                    continue
                # Ensure colon-separated format
                if ':' not in mac and len(mac) == 12:
                    mac = ':'.join(mac[i:i+2] for i in range(0, 12, 2))

                lat = get_col(row, ['latitude', 'lat'])
                lon = get_col(row, ['longitude', 'lon', 'long'])
                if lat is None or lon is None:
                    continue
                lat, lon = float(lat), float(lon)
                if lat == 0.0 and lon == 0.0:
                    continue

                timestamp = get_col(row, ['timestamp', 'time', 'firstseen'])
                seen_at = _apple_timestamp_to_datetime(timestamp) if timestamp else datetime.now(timezone.utc)

                channel = get_col(row, ['channel', 'chan'])
                channel = int(channel) if channel else 0

                rssi = get_col(row, ['signal', 'rssi', 'signalstrength'])
                rssi = int(rssi) if rssi else -100

                ssid = get_col(row, ['ssid', 'name'])
                ssid = str(ssid).strip() if ssid else ""

                observations.append(NetworkObservation(
                    network_type="wifi",
                    identifier=mac,
                    name=ssid,
                    channel=channel,
                    rssi=rssi,
                    latitude=lat,
                    longitude=lon,
                    seen_at=seen_at,
                ))
            except (ValueError, TypeError):
                continue

        return observations

    def _parse_cell(self, conn: sqlite3.Connection) -> list[NetworkObservation]:
        observations = []

        cell_tables = [
            "CellLocation",
            "celllocation",
            "cell",
        ]

        for table in cell_tables:
            try:
                cursor = conn.execute(f"SELECT * FROM {table}")
                columns = [desc[0].lower() for desc in cursor.description]
                break
            except sqlite3.OperationalError:
                continue
        else:
            return []

        def get_col(row, names):
            for name in names:
                if name in columns:
                    idx = columns.index(name)
                    return row[idx]
            return None

        for row in cursor:
            try:
                mcc = get_col(row, ['mcc'])
                mnc = get_col(row, ['mnc'])
                lac = get_col(row, ['lac', 'tac'])
                cid = get_col(row, ['ci', 'cid', 'cellid'])

                if mcc is None or mnc is None or cid is None:
                    continue

                lat = get_col(row, ['latitude', 'lat'])
                lon = get_col(row, ['longitude', 'lon', 'long'])
                if lat is None or lon is None:
                    continue
                lat, lon = float(lat), float(lon)
                if lat == 0.0 and lon == 0.0:
                    continue

                timestamp = get_col(row, ['timestamp', 'time'])
                seen_at = _apple_timestamp_to_datetime(timestamp) if timestamp else datetime.now(timezone.utc)

                # Determine radio type from available data
                radio = "GSM"
                radio_val = get_col(row, ['radio', 'type', 'networktype'])
                if radio_val:
                    r = str(radio_val).upper()
                    if r in ("LTE", "GSM", "CDMA", "WCDMA", "NR"):
                        radio = r

                observations.append(NetworkObservation(
                    network_type="cell",
                    identifier=f"{radio}:{mcc}:{mnc}:{lac}:{cid}",
                    name="",
                    latitude=lat,
                    longitude=lon,
                    seen_at=seen_at,
                    radio=radio,
                    mcc=int(mcc),
                    mnc=int(mnc),
                    lac=int(lac) if lac else None,
                    cid=int(cid),
                ))
            except (ValueError, TypeError):
                continue

        return observations
