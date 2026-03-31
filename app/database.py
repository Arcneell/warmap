from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

import ssl as _ssl

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args={"ssl": False},  # No SSL for internal Docker network
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session."""
    async with async_session() as session:
        yield session


async def init_db():
    """Create all tables. Used during startup or by Alembic."""
    from app.models.base import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# --- XP System (migrated from old database.py) ---

XP_PER_IMPORT = 1
XP_PER_UPDATE = 0
XP_PER_SESSION = 5
MAX_LEVEL = 100

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
    if level <= 1:
        return 0
    lvl = min(level, MAX_LEVEL)
    return lvl * (lvl - 1) * (lvl + 20) * 5


def level_from_xp(xp: int) -> int:
    level = 1
    while level < MAX_LEVEL and xp_for_level(level + 1) <= xp:
        level += 1
    return level


def rank_title(level: int) -> str:
    title = "Script Kiddie"
    for threshold, name in sorted(RANK_TITLES.items()):
        if level >= threshold:
            title = name
    return title
