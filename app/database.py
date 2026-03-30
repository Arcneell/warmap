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
XP_PER_IMPORT = 1
XP_PER_UPDATE = 0
XP_PER_SESSION = 5

# Level thresholds: level N requires N*(N-1)*10 total XP
# Lvl 2: 20, Lvl 5: 200, Lvl 10: 900, Lvl 20: 3800, Lvl 50: 24500, Lvl 100: 99000
# → Mapping all of La Réunion (~100k unique APs) ≈ level 100
RANK_TITLES = {
    1: "Script Kiddie",
    3: "Packet Sniffer",
    5: "Signal Hunter",
    8: "Spectrum Crawler",
    12: "RF Scout",
    16: "Wave Rider",
    22: "Airspace Mapper",
    30: "Ether Walker",
    40: "Frequency Ghost",
    55: "Wardriving Legend",
    70: "Phantom Scanner",
    85: "Radio God",
    100: "Omniscient Eye",
}


def xp_for_level(level: int) -> int:
    return level * (level - 1) * 10


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


async def _column_exists(db, table: str, column: str) -> bool:
    cursor = await db.execute(f"PRAGMA table_info({table})")
    cols = await cursor.fetchall()
    return any(c["name"] == column for c in cols)


async def _migrate(db):
    """Add missing columns to existing tables so old DBs survive upgrades."""
    if not await _column_exists(db, "sessions", "xp_earned"):
        await db.execute("ALTER TABLE sessions ADD COLUMN xp_earned INTEGER DEFAULT 0")

    # Recalculate XP with current rates from session data
    cursor = await db.execute(
        "SELECT COALESCE(SUM(ap_imported), 0) as imp, COALESCE(SUM(ap_updated), 0) as upd, COUNT(*) as sess FROM sessions"
    )
    row = await cursor.fetchone()
    correct_xp = (row["imp"] * XP_PER_IMPORT) + (row["upd"] * XP_PER_UPDATE) + (row["sess"] * XP_PER_SESSION)
    await db.execute("UPDATE profile SET xp = ? WHERE id = 1", (correct_xp,))


async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await _migrate(db)
        await db.commit()
    finally:
        await db.close()
