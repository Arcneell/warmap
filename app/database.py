import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "wardrove.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    pseudo TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    ap_imported INTEGER DEFAULT 0,
    ap_updated INTEGER DEFAULT 0,
    ap_skipped INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS access_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bssid TEXT UNIQUE NOT NULL,
    ssid TEXT DEFAULT '',
    encryption TEXT DEFAULT 'Unknown',
    channel INTEGER DEFAULT 0,
    rssi INTEGER DEFAULT -100,
    latitude REAL DEFAULT 0.0,
    longitude REAL DEFAULT 0.0,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    device_type TEXT DEFAULT 'WIFI',
    session_id INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_bssid ON access_points(bssid);
CREATE INDEX IF NOT EXISTS idx_encryption ON access_points(encryption);
CREATE INDEX IF NOT EXISTS idx_coords ON access_points(latitude, longitude);
"""

# XP rewards
XP_PER_IMPORT = 10
XP_PER_UPDATE = 3
XP_PER_SESSION = 50

# Level thresholds: level N requires N*(N-1)*50 total XP
# Lvl 1: 0, Lvl 2: 100, Lvl 3: 300, Lvl 4: 600, Lvl 5: 1000, ...
RANK_TITLES = {
    1: "Script Kiddie",
    2: "Packet Sniffer",
    3: "Signal Hunter",
    4: "Spectrum Crawler",
    5: "RF Scout",
    7: "Wave Rider",
    10: "Airspace Mapper",
    13: "Ether Walker",
    16: "Frequency Ghost",
    20: "Wardriving Legend",
    25: "Omniscient Eye",
}


def xp_for_level(level: int) -> int:
    return level * (level - 1) * 50


def level_from_xp(xp: int) -> int:
    level = 1
    while xp_for_level(level + 1) <= xp:
        level += 1
    return level


def rank_title(level: int) -> str:
    title = "Script Kiddie"
    for threshold, name in sorted(RANK_TITLES.items()):
        if level >= threshold:
            title = name
    return title


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()
