"""Format detection and parser dispatch.

Supports: WiGLE CSV, Kismet (.netxml, .csv), KML/KMZ, NetStumbler (.ns1, text, wiscan),
Consolidated.db (iOS SQLite), DStumbler, MacStumbler (plist), and compressed archives.
"""

import sqlite3
import tempfile
import os

from app.parsers.archive import decompress
from app.parsers.base import BaseParser, NetworkObservation
from app.parsers.consolidated_db import ConsolidatedDbParser
from app.parsers.dstumbler import DStumblerParser
from app.parsers.kismet import KismetCsvParser, KismetNetXmlParser
from app.parsers.kml import KmlParser
from app.parsers.macstumbler import MacStumblerParser
from app.parsers.netstumbler import NetStumblerNs1Parser, NetStumblerTextParser
from app.parsers.wigle_csv import WigleCsvParser

# Parser instances (singletons)
_wigle_csv = WigleCsvParser()
_kismet_netxml = KismetNetXmlParser()
_kismet_csv = KismetCsvParser()
_kml = KmlParser()
_ns1 = NetStumblerNs1Parser()
_ns_text = NetStumblerTextParser()
_consolidated_db = ConsolidatedDbParser()
_dstumbler = DStumblerParser()
_macstumbler = MacStumblerParser()

# Extension-based mapping (checked first, most specific wins)
EXTENSION_MAP: list[tuple[str, str, BaseParser]] = [
    (".wigle.csv", "wigle_csv", _wigle_csv),
    (".kismet.netxml", "kismet_netxml", _kismet_netxml),
    (".netxml", "kismet_netxml", _kismet_netxml),
    (".kismet.csv", "kismet_csv", _kismet_csv),
    (".kmz", "kml", _kml),
    (".kml", "kml", _kml),
    (".ns1", "netstumbler", _ns1),
    (".wiscan", "netstumbler_text", _ns_text),
    (".plist", "macstumbler", _macstumbler),
]

ARCHIVE_EXTENSIONS = {".gz", ".tar.gz", ".tgz", ".zip"}

# SQLite magic bytes
SQLITE_MAGIC = b"SQLite format 3\x00"

# Plist magic
PLIST_MAGIC_XML = b"<?xml"
PLIST_MAGIC_BPLIST = b"bplist"


def detect_format(filename: str, content: bytes) -> str:
    """Detect file format by extension, then by content inspection."""
    lower = filename.lower()

    # 1. Check extension map (most specific first, list is ordered)
    for ext, fmt_id, _ in EXTENSION_MAP:
        if lower.endswith(ext):
            return fmt_id

    # 2. Content-based detection

    # SQLite (consolidated.db)
    if content[:16] == SQLITE_MAGIC:
        return _detect_sqlite_type(content)

    # Try decoding header for text-based formats
    try:
        header = content[:500].decode('utf-8', errors='replace')
    except Exception:
        header = ""

    header_2k = ""
    try:
        header_2k = content[:2000].decode('utf-8', errors='replace')
    except Exception:
        pass

    # WiGLE CSV (most common)
    if header.startswith("WigleWifi") or "WigleWifi" in header[:100]:
        return "wigle_csv"

    # Kismet netxml
    if "<?xml" in header and "wireless-network" in header_2k:
        return "kismet_netxml"

    # KML
    if "<?xml" in header and ("kml" in header.lower() or "opengis.net/kml" in header_2k.lower()):
        return "kml"

    # Plist (MacStumbler)
    if content[:5] == PLIST_MAGIC_XML and b"plist" in content[:200]:
        return "macstumbler"
    if content[:6] == PLIST_MAGIC_BPLIST:
        return "macstumbler"

    # Kismet CSV (semicolon-delimited with Network/BSSID header)
    if ";" in header and ("Network" in header or "BSSID" in header):
        return "kismet_csv"

    # Generic CSV with MAC/SSID columns -> WiGLE CSV
    if "MAC" in header and "SSID" in header:
        return "wigle_csv"

    # Tab-separated with MAC addresses -> NetStumbler text or wiscan
    if "\t" in header:
        lines = header.splitlines()
        for line in lines[:5]:
            parts = line.split('\t')
            if len(parts) >= 4:
                # Check if first field looks like a MAC
                if ':' in parts[0] and len(parts[0].strip()) >= 11:
                    return "netstumbler_text"

    # Key: Value format (DStumbler)
    lower_header = header.lower()
    if ('bssid:' in lower_header or 'mac:' in lower_header) and ('ssid:' in lower_header or 'latitude:' in lower_header):
        return "dstumbler"

    # .csv extension -> try WiGLE CSV
    if lower.endswith('.csv'):
        return "wigle_csv"

    # .db extension -> try consolidated.db
    if lower.endswith('.db'):
        return "consolidated_db"

    # .txt extension -> try NetStumbler text
    if lower.endswith('.txt'):
        return "netstumbler_text"

    # .xml extension -> try kismet netxml
    if lower.endswith('.xml'):
        if "wireless-network" in header_2k:
            return "kismet_netxml"
        return "kml"  # fallback for XML

    return "unknown"


def _detect_sqlite_type(content: bytes) -> str:
    """Detect what kind of SQLite database this is."""
    fd, tmp_path = tempfile.mkstemp(suffix=".db")
    try:
        os.write(fd, content)
        os.close(fd)

        conn = sqlite3.connect(tmp_path)
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = {row[0].lower() for row in cursor.fetchall()}
        conn.close()

        # iOS consolidated.db
        if "wifilocation" in tables or "celllocation" in tables:
            return "consolidated_db"
        if "wifi" in tables or "cell" in tables:
            return "consolidated_db"

        # Generic SQLite with location data
        return "consolidated_db"
    except Exception:
        return "consolidated_db"
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def get_parser(format_id: str) -> BaseParser | None:
    """Get parser instance by format ID."""
    parsers = {
        "wigle_csv": _wigle_csv,
        "kismet_netxml": _kismet_netxml,
        "kismet_csv": _kismet_csv,
        "kml": _kml,
        "netstumbler": _ns1,
        "netstumbler_text": _ns_text,
        "consolidated_db": _consolidated_db,
        "dstumbler": _dstumbler,
        "macstumbler": _macstumbler,
    }
    return parsers.get(format_id)


def parse_file(filename: str, content: bytes) -> tuple[str, list[NetworkObservation]]:
    """Parse a file, handling archives and format detection.

    Returns (format_id, observations).
    """
    lower = filename.lower()

    # Check if it's an archive (KMZ handled by KmlParser directly)
    is_archive = any(lower.endswith(ext) for ext in ARCHIVE_EXTENSIONS)
    if is_archive and not lower.endswith(".kmz"):
        files = decompress(content, filename)
        all_observations = []
        detected_format = "archive"
        for inner_name, inner_content in files:
            fmt, obs = parse_file(inner_name, inner_content)
            if fmt != "unknown":
                detected_format = fmt
            all_observations.extend(obs)
        return detected_format, all_observations

    # Detect and parse
    format_id = detect_format(filename, content)
    parser = get_parser(format_id)
    if parser is None:
        return format_id, []

    observations = parser.parse(content, filename)
    return format_id, observations
