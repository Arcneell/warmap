"""Kismet format parsers (.netxml, .csv)."""

import csv
import io
from datetime import datetime
from xml.etree import ElementTree

from app.parsers.base import BaseParser, NetworkObservation
from app.parsers.wigle_csv import classify_encryption


class KismetNetXmlParser(BaseParser):
    """Parse Kismet .netxml (network XML) files."""

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        observations = []
        try:
            root = ElementTree.fromstring(content)
        except ElementTree.ParseError:
            return []

        for network in root.findall(".//wireless-network"):
            net_type = network.get("type", "")
            if net_type == "probe":
                continue

            bssid_elem = network.find("BSSID")
            if bssid_elem is None or not bssid_elem.text:
                continue
            bssid = bssid_elem.text.strip().upper()

            ssid_elem = network.find(".//SSID/essid")
            ssid = ssid_elem.text.strip() if ssid_elem is not None and ssid_elem.text else ""

            encryption_elems = network.findall(".//SSID/encryption")
            enc_str = ",".join(e.text for e in encryption_elems if e.text)
            encryption = classify_encryption(enc_str)

            channel_elem = network.find("channel")
            channel = int(channel_elem.text) if channel_elem is not None and channel_elem.text else 0

            freq_elem = network.find("freqmhz")
            frequency = 0
            if freq_elem is not None and freq_elem.text:
                try:
                    frequency = int(freq_elem.text.split()[0])
                except (ValueError, IndexError):
                    pass

            # Signal info
            rssi = -100
            snr_elem = network.find(".//snr-info/last_signal_dbm")
            if snr_elem is None:
                snr_elem = network.find(".//snr-info/max_signal_dbm")
            if snr_elem is not None and snr_elem.text:
                try:
                    rssi = int(snr_elem.text)
                except ValueError:
                    pass

            # GPS
            gps_elem = network.find("gps-info")
            lat, lon, alt = None, None, None
            if gps_elem is not None:
                lat_elem = gps_elem.find("avg-lat")
                lon_elem = gps_elem.find("avg-lon")
                alt_elem = gps_elem.find("avg-alt")
                if lat_elem is not None and lat_elem.text:
                    lat = float(lat_elem.text)
                if lon_elem is not None and lon_elem.text:
                    lon = float(lon_elem.text)
                if alt_elem is not None and alt_elem.text:
                    alt = float(alt_elem.text)

            if lat is None or lon is None or (lat == 0.0 and lon == 0.0):
                continue

            # Timestamps
            first_seen_elem = network.find("first-time")
            seen_at = None
            if first_seen_elem is not None and first_seen_elem.text:
                try:
                    seen_at = datetime.strptime(
                        first_seen_elem.text, "%a %b %d %H:%M:%S %Y"
                    )
                except ValueError:
                    pass

            observations.append(
                NetworkObservation(
                    network_type="wifi",
                    identifier=bssid,
                    name=ssid,
                    encryption=encryption,
                    channel=channel,
                    frequency=frequency,
                    rssi=rssi,
                    latitude=lat,
                    longitude=lon,
                    altitude=alt,
                    seen_at=seen_at,
                )
            )

        return observations


class KismetCsvParser(BaseParser):
    """Parse Kismet .csv files."""

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        text = content.decode("utf-8", errors="replace")
        observations = []

        reader = csv.DictReader(io.StringIO(text), delimiter=";")

        for row in reader:
            try:
                bssid = (row.get("BSSID", "") or "").strip().upper()
                if not bssid:
                    continue

                ssid = (row.get("SSID", "") or row.get("Essid", "") or "").strip()
                encryption = classify_encryption(
                    row.get("Encryption", "") or row.get("Privacy", "") or ""
                )
                channel = int(row.get("Channel", 0) or 0)

                # GPS
                lat = float(row.get("GPSBestLat", 0) or row.get("BestLat", 0) or 0)
                lon = float(row.get("GPSBestLon", 0) or row.get("BestLon", 0) or 0)
                if lat == 0.0 and lon == 0.0:
                    continue

                rssi = -100
                signal = row.get("BestSignal", "") or row.get("Signal", "")
                if signal:
                    try:
                        rssi = int(signal)
                    except ValueError:
                        pass

                seen_at = None
                first_time = row.get("FirstTime", "") or row.get("First Time", "")
                if first_time:
                    for fmt in (
                        "%a %b %d %H:%M:%S %Y",
                        "%Y-%m-%d %H:%M:%S",
                    ):
                        try:
                            seen_at = datetime.strptime(first_time.strip(), fmt)
                            break
                        except ValueError:
                            continue

                observations.append(
                    NetworkObservation(
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
                )
            except (ValueError, KeyError):
                continue

        return observations
