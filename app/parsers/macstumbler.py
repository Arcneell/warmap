"""MacStumbler plist XML and wiscan parser.

MacStumbler exports data in Apple plist XML format containing
an array of dictionaries with network information.
"""

import plistlib
from datetime import datetime, timezone

from app.parsers.base import BaseParser, NetworkObservation
from app.parsers.wigle_csv import classify_encryption


class MacStumblerParser(BaseParser):
    """Parse MacStumbler plist XML files."""

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        observations = []

        try:
            plist = plistlib.loads(content)
        except Exception:
            return []

        # MacStumbler plists are typically an array of dicts or a dict with an array
        networks = []
        if isinstance(plist, list):
            networks = plist
        elif isinstance(plist, dict):
            # Try common keys
            for key in ('networks', 'Networks', 'items', 'scanResults', 'data'):
                if key in plist and isinstance(plist[key], list):
                    networks = plist[key]
                    break
            if not networks:
                # Maybe the dict itself is a single network
                if 'BSSID' in plist or 'bssid' in plist:
                    networks = [plist]

        for net in networks:
            if not isinstance(net, dict):
                continue

            obs = self._parse_network(net)
            if obs:
                observations.append(obs)

        return observations

    @staticmethod
    def _get(d: dict, *keys, default=None):
        """Get value from dict trying multiple key names (case-insensitive)."""
        lower_d = {k.lower(): v for k, v in d.items()}
        for key in keys:
            if key.lower() in lower_d:
                return lower_d[key.lower()]
        return default

    def _parse_network(self, net: dict) -> NetworkObservation | None:
        bssid = self._get(net, 'BSSID', 'bssid', 'MAC', 'mac', 'macAddress')
        if not bssid:
            return None
        bssid = str(bssid).strip().upper()
        if len(bssid) < 11:
            return None
        # Ensure colon format
        if '-' in bssid:
            bssid = bssid.replace('-', ':')

        lat = self._get(net, 'latitude', 'lat', 'Latitude')
        lon = self._get(net, 'longitude', 'lon', 'long', 'Longitude')
        if lat is None or lon is None:
            return None
        try:
            lat, lon = float(lat), float(lon)
        except (ValueError, TypeError):
            return None
        if lat == 0.0 and lon == 0.0:
            return None

        ssid = self._get(net, 'SSID', 'ssid', 'name', 'networkName', default='')
        ssid = str(ssid).strip()

        enc_str = self._get(net, 'encryption', 'security', 'privacy', 'authMode', default='')
        encryption = classify_encryption(str(enc_str))

        channel = self._get(net, 'channel', 'Channel', default=0)
        try:
            channel = int(channel)
        except (ValueError, TypeError):
            channel = 0

        rssi = self._get(net, 'signal', 'rssi', 'RSSI', 'signalStrength', default=-100)
        try:
            rssi = int(rssi)
        except (ValueError, TypeError):
            rssi = -100

        seen_at = None
        ts = self._get(net, 'firstSeen', 'timestamp', 'date', 'time')
        if isinstance(ts, datetime):
            seen_at = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        elif isinstance(ts, (int, float)):
            try:
                seen_at = datetime.fromtimestamp(ts, tz=timezone.utc)
            except (OSError, ValueError):
                pass

        return NetworkObservation(
            network_type="wifi",
            identifier=bssid,
            name=ssid,
            encryption=encryption,
            channel=channel,
            rssi=rssi,
            latitude=lat,
            longitude=lon,
            seen_at=seen_at,
        )
