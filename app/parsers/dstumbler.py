"""DStumbler text output parser.

DStumbler outputs lines like:
  ; SSID: NetworkName
  ; BSSID: AA:BB:CC:DD:EE:FF
  ; Channel: 6
  ; Signal: -50
  ; GPS: lat,lon
"""

from datetime import datetime

from app.parsers.base import BaseParser, NetworkObservation
from app.parsers.wigle_csv import classify_encryption


class DStumblerParser(BaseParser):
    """Parse DStumbler text output files."""

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        try:
            text = content.decode('utf-8', errors='replace')
        except Exception:
            return []

        observations = []
        lines = text.strip().splitlines()

        # Parse as block-based records separated by blank lines or markers
        current = {}
        for line in lines:
            line = line.strip()

            if not line or line.startswith('#') or line.startswith('--'):
                if current.get('bssid') and current.get('lat'):
                    obs = self._make_observation(current)
                    if obs:
                        observations.append(obs)
                current = {}
                continue

            # Key: Value format
            if ':' in line:
                # Handle "prefix; Key: Value" format
                if ';' in line:
                    line = line.split(';', 1)[-1].strip()

                parts = line.split(':', 1)
                if len(parts) == 2:
                    key = parts[0].strip().lower()
                    value = parts[1].strip()

                    if key in ('bssid', 'mac', 'macaddress'):
                        current['bssid'] = value.upper()
                    elif key in ('ssid', 'name', 'essid'):
                        current['ssid'] = value
                    elif key in ('channel', 'chan'):
                        try:
                            current['channel'] = int(value)
                        except ValueError:
                            pass
                    elif key in ('signal', 'rssi', 'level'):
                        try:
                            current['rssi'] = int(value.replace('dBm', '').strip())
                        except ValueError:
                            pass
                    elif key in ('encryption', 'privacy', 'security', 'auth'):
                        current['encryption'] = classify_encryption(value)
                    elif key in ('gps', 'location', 'coordinates', 'coord'):
                        self._parse_gps(value, current)
                    elif key in ('latitude', 'lat'):
                        try:
                            current['lat'] = float(value)
                        except ValueError:
                            pass
                    elif key in ('longitude', 'lon', 'long'):
                        try:
                            current['lon'] = float(value)
                        except ValueError:
                            pass

            # Tab-separated data line (some DStumbler variants)
            elif '\t' in line:
                parts = line.split('\t')
                if len(parts) >= 5:
                    try:
                        bssid = parts[0].strip().upper()
                        if ':' in bssid and len(bssid) >= 11:
                            current['bssid'] = bssid
                            current['ssid'] = parts[1].strip() if len(parts) > 1 else ""
                            if len(parts) > 2 and parts[2].strip().isdigit():
                                current['channel'] = int(parts[2].strip())
                            if len(parts) > 3:
                                try:
                                    current['rssi'] = int(parts[3].strip())
                                except ValueError:
                                    pass
                            if len(parts) > 5:
                                try:
                                    current['lat'] = float(parts[4].strip())
                                    current['lon'] = float(parts[5].strip())
                                except ValueError:
                                    pass
                    except (ValueError, IndexError):
                        pass

        # Don't forget last record
        if current.get('bssid') and current.get('lat'):
            obs = self._make_observation(current)
            if obs:
                observations.append(obs)

        return observations

    @staticmethod
    def _parse_gps(value: str, current: dict):
        """Parse GPS from 'lat,lon' or 'lat lon' format."""
        for sep in (',', ' ', ';'):
            if sep in value:
                parts = value.split(sep)
                if len(parts) >= 2:
                    try:
                        current['lat'] = float(parts[0].strip())
                        current['lon'] = float(parts[1].strip())
                        return
                    except ValueError:
                        continue

    @staticmethod
    def _make_observation(data: dict) -> NetworkObservation | None:
        lat = data.get('lat', 0.0)
        lon = data.get('lon', 0.0)
        if lat == 0.0 and lon == 0.0:
            return None
        bssid = data.get('bssid', '')
        if not bssid or len(bssid) < 11:
            return None

        return NetworkObservation(
            network_type="wifi",
            identifier=bssid,
            name=data.get('ssid', ''),
            encryption=data.get('encryption', 'Unknown'),
            channel=data.get('channel'),
            rssi=data.get('rssi', -100),
            latitude=lat,
            longitude=lon,
        )
