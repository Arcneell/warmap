"""KML/KMZ file parser for wardriving data."""

import io
import re
import zipfile
from datetime import datetime
from xml.etree import ElementTree

from app.parsers.base import BaseParser, NetworkObservation

KML_NS = {"kml": "http://www.opengis.net/kml/2.2"}


class KmlParser(BaseParser):
    """Parse KML and KMZ files from various wardriving tools."""

    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        if filename.lower().endswith(".kmz"):
            return self._parse_kmz(content)
        return self._parse_kml(content)

    def _parse_kmz(self, content: bytes) -> list[NetworkObservation]:
        observations = []
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                for name in zf.namelist():
                    if name.lower().endswith(".kml"):
                        kml_content = zf.read(name)
                        observations.extend(self._parse_kml(kml_content))
        except zipfile.BadZipFile:
            pass
        return observations

    def _parse_kml(self, content: bytes) -> list[NetworkObservation]:
        observations = []
        try:
            root = ElementTree.fromstring(content)
        except ElementTree.ParseError:
            return []

        # Find all Placemarks
        for placemark in root.findall(".//kml:Placemark", KML_NS):
            obs = self._parse_placemark(placemark)
            if obs:
                observations.append(obs)

        # Try without namespace (some KML files don't use it)
        if not observations:
            for placemark in root.findall(".//{http://www.opengis.net/kml/2.2}Placemark"):
                obs = self._parse_placemark(placemark)
                if obs:
                    observations.append(obs)

        # Last resort: try without any namespace
        if not observations:
            for placemark in root.iter("Placemark"):
                obs = self._parse_placemark_no_ns(placemark)
                if obs:
                    observations.append(obs)

        return observations

    def _parse_placemark(self, placemark) -> NetworkObservation | None:
        name_elem = placemark.find("kml:name", KML_NS)
        name = name_elem.text.strip() if name_elem is not None and name_elem.text else ""

        coords_elem = placemark.find(".//kml:coordinates", KML_NS)
        if coords_elem is None or not coords_elem.text:
            return None

        coords = self._parse_coordinates(coords_elem.text)
        if not coords:
            return None
        lon, lat, alt = coords

        # Try to extract BSSID/SSID from description or extended data
        desc_elem = placemark.find("kml:description", KML_NS)
        desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""

        bssid, ssid, encryption = self._extract_network_info(name, desc)
        if not bssid:
            return None

        return NetworkObservation(
            network_type="wifi",
            identifier=bssid,
            name=ssid,
            encryption=encryption,
            latitude=lat,
            longitude=lon,
            altitude=alt if alt != 0 else None,
        )

    def _parse_placemark_no_ns(self, placemark) -> NetworkObservation | None:
        name_elem = placemark.find("name")
        name = name_elem.text.strip() if name_elem is not None and name_elem.text else ""

        coords_elem = placemark.find(".//coordinates")
        if coords_elem is None or not coords_elem.text:
            return None

        coords = self._parse_coordinates(coords_elem.text)
        if not coords:
            return None
        lon, lat, alt = coords

        desc_elem = placemark.find("description")
        desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""

        bssid, ssid, encryption = self._extract_network_info(name, desc)
        if not bssid:
            return None

        return NetworkObservation(
            network_type="wifi",
            identifier=bssid,
            name=ssid,
            encryption=encryption,
            latitude=lat,
            longitude=lon,
            altitude=alt if alt != 0 else None,
        )

    @staticmethod
    def _parse_coordinates(text: str) -> tuple[float, float, float] | None:
        parts = text.strip().split(",")
        if len(parts) < 2:
            return None
        try:
            lon = float(parts[0])
            lat = float(parts[1])
            alt = float(parts[2]) if len(parts) > 2 else 0.0
            if lat == 0.0 and lon == 0.0:
                return None
            return lon, lat, alt
        except ValueError:
            return None

    @staticmethod
    def _extract_network_info(name: str, desc: str) -> tuple[str, str, str]:
        bssid = ""
        ssid = name
        encryption = "Unknown"

        # Try to find MAC address pattern in name or description
        mac_pattern = r"([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}"
        combined = f"{name} {desc}"

        mac_match = re.search(mac_pattern, combined)
        if mac_match:
            bssid = mac_match.group().upper().replace("-", ":")

        # If BSSID is in the name, SSID might be elsewhere
        if bssid and bssid in name:
            ssid = name.replace(bssid, "").strip(" -:")

        # Try to find encryption in description
        desc_upper = desc.upper()
        if "WPA3" in desc_upper or "SAE" in desc_upper:
            encryption = "WPA3"
        elif "WPA2" in desc_upper or "RSN" in desc_upper:
            encryption = "WPA2"
        elif "WPA" in desc_upper:
            encryption = "WPA"
        elif "WEP" in desc_upper:
            encryption = "WEP"
        elif "OPEN" in desc_upper or "NONE" in desc_upper:
            encryption = "Open"

        return bssid, ssid, encryption
