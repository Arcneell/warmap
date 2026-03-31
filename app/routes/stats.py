from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.services.oui import get_manufacturer_stats
from app.services.stats import get_global_stats, get_leaderboard
from app.services.stats_cache import cached_stats, set_cached_stats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
async def global_stats(db: AsyncSession = Depends(get_db)):
    """Get global platform statistics (cached 5min)."""
    cached = await cached_stats("global")
    if cached:
        return cached
    result = await get_global_stats(db)
    await set_cached_stats("global", result)
    return result


@router.get("/leaderboard")
async def leaderboard(
    sort_by: str = Query("xp", pattern="^(xp|wifi)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Get user leaderboard."""
    return await get_leaderboard(db, sort_by=sort_by, limit=limit, offset=offset)


@router.get("/channels")
async def channel_distribution(db: AsyncSession = Depends(get_db)):
    """Get WiFi channel distribution (cached 5min)."""
    cached = await cached_stats("channels")
    if cached:
        return cached

    result = await db.execute(
        select(WifiNetwork.channel, func.count(WifiNetwork.id).label("count"))
        .where(WifiNetwork.channel > 0)
        .group_by(WifiNetwork.channel)
        .order_by(WifiNetwork.channel)
    )
    channels = {str(row[0]): row[1] for row in result.all()}
    await set_cached_stats("channels", channels)
    return channels


@router.get("/encryption")
async def encryption_distribution(db: AsyncSession = Depends(get_db)):
    """Get global encryption type distribution (cached 5min)."""
    cached = await cached_stats("encryption")
    if cached:
        return cached

    result = await db.execute(
        select(WifiNetwork.encryption, func.count(WifiNetwork.id).label("count"))
        .group_by(WifiNetwork.encryption)
        .order_by(func.count(WifiNetwork.id).desc())
    )
    data = {row[0]: row[1] for row in result.all()}
    await set_cached_stats("encryption", data)
    return data


@router.get("/manufacturers")
async def manufacturer_distribution(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get manufacturer/OUI distribution (cached 5min)."""
    cache_key = f"manufacturers:{limit}"
    cached = await cached_stats(cache_key)
    if cached:
        return cached

    result = await db.execute(select(WifiNetwork.bssid))
    macs = [row[0] for row in result.all()]
    stats = get_manufacturer_stats(macs)
    # Limit
    top = dict(list(stats.items())[:limit])
    await set_cached_stats(cache_key, top)
    return top


@router.get("/countries")
async def country_stats(db: AsyncSession = Depends(get_db)):
    """Get per-country network counts.

    Based on MCC codes from cell towers. WiFi networks don't have
    country information without reverse geocoding.
    """
    cached = await cached_stats("countries")
    if cached:
        return cached

    # MCC to country mapping (subset of most common)
    mcc_map = {
        208: "France", 310: "United States", 311: "United States",
        234: "United Kingdom", 262: "Germany", 222: "Italy",
        214: "Spain", 206: "Belgium", 204: "Netherlands",
        228: "Switzerland", 232: "Austria", 240: "Sweden",
        242: "Norway", 238: "Denmark", 244: "Finland",
        226: "Romania", 260: "Poland", 230: "Czech Republic",
        216: "Hungary", 219: "Croatia", 293: "Slovenia",
        284: "Bulgaria", 246: "Lithuania", 247: "Latvia",
        248: "Estonia", 270: "Luxembourg", 340: "France (Overseas)",
        647: "Reunion", 617: "Mauritius",
        302: "Canada", 334: "Mexico", 724: "Brazil",
        722: "Argentina", 730: "Chile", 732: "Colombia",
        440: "Japan", 450: "South Korea", 460: "China",
        510: "Indonesia", 520: "Thailand", 515: "Philippines",
        452: "Vietnam", 502: "Malaysia", 525: "Singapore",
        505: "Australia", 530: "New Zealand",
        404: "India", 410: "Pakistan",
        602: "Egypt", 655: "South Africa", 621: "Nigeria",
        420: "Saudi Arabia", 425: "Israel",
        250: "Russia", 255: "Ukraine",
    }

    result = await db.execute(
        select(CellTower.mcc, func.count(CellTower.id).label("count"))
        .group_by(CellTower.mcc)
        .order_by(func.count(CellTower.id).desc())
    )
    countries = {}
    for mcc, count in result.all():
        country = mcc_map.get(mcc, f"MCC {mcc}")
        countries[country] = countries.get(country, 0) + count

    # Also count WiFi by rough estimate (total / active countries)
    wifi_total = await db.scalar(select(func.count(WifiNetwork.id))) or 0
    bt_total = await db.scalar(select(func.count(BtNetwork.id))) or 0

    data = {
        "by_cell_mcc": countries,
        "total_wifi": wifi_total,
        "total_bt": bt_total,
        "total_cell": sum(countries.values()),
    }
    await set_cached_stats("countries", data)
    return data


@router.get("/top-ssids")
async def top_ssids(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get most common SSIDs."""
    cached = await cached_stats(f"top_ssids:{limit}")
    if cached:
        return cached

    result = await db.execute(
        select(WifiNetwork.ssid, func.count(WifiNetwork.id).label("count"))
        .where(WifiNetwork.ssid != "")
        .group_by(WifiNetwork.ssid)
        .order_by(func.count(WifiNetwork.id).desc())
        .limit(limit)
    )
    data = [{"ssid": row[0], "count": row[1]} for row in result.all()]
    await set_cached_stats(f"top_ssids:{limit}", data)
    return data
