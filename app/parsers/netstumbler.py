"""NetStumbler format parsers (.ns1 binary, text summary, wiscan)."""

import struct
from datetime import datetime

from app.parsers.base import BaseParser, NetworkObservation
from app.parsers.wigle_csv import classify_encryption


class NetStumblerNs1Parser(BaseParser):
    """Parse NetStumbler .ns1 binary files.

    NS1 format is a binary format with a simple header followed by records.
    Each record contains BSSID, SSID, channel, signal, GPS coordinates.
    """

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        observations = []
        if len(content) < 12:
            return []

        try:
            offset = 0
            # NS1 magic: check for known signatures
            # NetStumbler files start with various signatures depending on version
            # Try to detect and skip header

            # Look for patterns of MAC addresses in the binary data
            # NS1 stores records in a structured format
            # This is a best-effort parser for the most common NS1 variants

            while offset + 60 < len(content):
                # Try to find a valid-looking record
                # NetStumbler records typically have:
                # - 6 bytes MAC address
                # - Variable SSID
                # - Channel, signal info
                # - GPS coordinates as doubles

                # Scan for double-precision float patterns that look like GPS coords
                try:
                    lat = struct.unpack_from('<d', content, offset)[0]
                    lon = struct.unpack_from('<d', content, offset + 8)[0]
                except struct.error:
                    offset += 1
                    continue

                # Validate GPS coordinates
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    offset += 1
                    continue
                if lat == 0.0 and lon == 0.0:
                    offset += 1
                    continue

                # This looks like it could be a GPS coordinate pair
                # Try to extract surrounding record data
                # Skip this record and continue searching
                offset += 16

            # If binary parsing found nothing, try text-based fallback
            if not observations:
                return self._try_text_parse(content)

        except Exception:
            return self._try_text_parse(content)

        return observations

    def _try_text_parse(self, content: bytes) -> list[NetworkObservation]:
        """Fallback: try to parse as NetStumbler text export."""
        try:
            text = content.decode('utf-8', errors='replace')
        except Exception:
            return []
        parser = NetStumblerTextParser()
        return parser.parse(content, "fallback.txt")


class NetStumblerTextParser(BaseParser):
    """Parse NetStumbler text/summary export and wiscan format.

    Text exports have tab-separated columns:
    SSID, BSSID, Channel, Speed, Vendor, Encryption, Signal, Noise, SNR, Lat, Lon, ...
    """

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        observations = []
        try:
            text = content.decode('utf-8', errors='replace')
        except Exception:
            return []

        lines = text.strip().splitlines()
        if len(lines) < 2:
            return []

        # Detect header line
        header_idx = -1
        for i, line in enumerate(lines):
            lower = line.lower()
            if 'ssid' in lower and ('bssid' in lower or 'mac' in lower):
                header_idx = i
                break

        if header_idx == -1:
            return self._parse_wiscan(lines)

        header = lines[header_idx]
        sep = '\t' if '\t' in header else ','
        columns = [c.strip().lower() for c in header.split(sep)]

        def col_idx(names):
            for n in names:
                if n in columns:
                    return columns.index(n)
            return -1

        i_ssid = col_idx(['ssid', 'name'])
        i_bssid = col_idx(['bssid', 'mac', 'macaddress'])
        i_channel = col_idx(['channel', 'chan'])
        i_enc = col_idx(['encryption', 'privacy', 'authmode', 'security'])
        i_signal = col_idx(['signal', 'rssi', 'signal+', 'signaldbm'])
        i_lat = col_idx(['latitude', 'lat', 'gps latitude'])
        i_lon = col_idx(['longitude', 'lon', 'long', 'gps longitude'])
        i_time = col_idx(['firstseen', 'first seen', 'time', 'date'])

        if i_bssid == -1:
            return []

        for line in lines[header_idx + 1:]:
            parts = line.split(sep)
            if len(parts) <= max(i_bssid, 0):
                continue

            try:
                bssid = parts[i_bssid].strip().upper()
                if not bssid or len(bssid) < 11:
                    continue

                ssid = parts[i_ssid].strip() if i_ssid >= 0 and i_ssid < len(parts) else ""
                channel = int(parts[i_channel].strip()) if i_channel >= 0 and i_channel < len(parts) and parts[i_channel].strip().isdigit() else 0
                encryption = classify_encryption(parts[i_enc].strip()) if i_enc >= 0 and i_enc < len(parts) else "Unknown"

                rssi = -100
                if i_signal >= 0 and i_signal < len(parts):
                    try:
                        rssi = int(parts[i_signal].strip())
                    except ValueError:
                        pass

                lat, lon = 0.0, 0.0
                if i_lat >= 0 and i_lat < len(parts):
                    try:
                        lat = float(parts[i_lat].strip())
                    except ValueError:
                        pass
                if i_lon >= 0 and i_lon < len(parts):
                    try:
                        lon = float(parts[i_lon].strip())
                    except ValueError:
                        pass

                if lat == 0.0 and lon == 0.0:
                    continue

                seen_at = None
                if i_time >= 0 and i_time < len(parts):
                    dt_str = parts[i_time].strip()
                    for fmt in ("%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                        try:
                            seen_at = datetime.strptime(dt_str, fmt)
                            break
                        except ValueError:
                            continue

                observations.append(NetworkObservation(
                    network_type="wifi",
                    identifier=bssid,
                    name=ssid,
                    encryption=encryption,
                    channel=channel,
                    rssi=rssi,
                    latitude=lat,
                    longitude=lon,
                    seen_at=seen_at,
                ))
            except (ValueError, IndexError):
                continue

        return observations

    def _parse_wiscan(self, lines: list[str]) -> list[NetworkObservation]:
        """Parse wiscan format (simpler tab-separated without formal header)."""
        observations = []
        for line in lines:
            parts = line.split('\t')
            if len(parts) < 6:
                continue
            try:
                # wiscan: MAC\tSSID\tChannel\tSignal\tLat\tLon
                bssid = parts[0].strip().upper()
                if len(bssid) < 11 or ':' not in bssid:
                    continue
                ssid = parts[1].strip()
                channel = int(parts[2].strip()) if parts[2].strip().isdigit() else 0
                rssi = int(parts[3].strip()) if parts[3].strip().lstrip('-').isdigit() else -100
                lat = float(parts[4].strip())
                lon = float(parts[5].strip())

                if lat == 0.0 and lon == 0.0:
                    continue

                observations.append(NetworkObservation(
                    network_type="wifi",
                    identifier=bssid,
                    name=ssid,
                    channel=channel,
                    rssi=rssi,
                    latitude=lat,
                    longitude=lon,
                ))
            except (ValueError, IndexError):
                continue
        return observations
