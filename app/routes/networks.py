from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user_optional
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.user import User
from app.schemas.network import (
    BtNetworkResponse,
    BtSearchParams,
    CellSearchParams,
    CellTowerResponse,
    PaginatedResponse,
    WifiNetworkResponse,
    WifiSearchParams,
)
from app.services.export import export_geojson
from app.services.search import search_bt, search_cell, search_wifi

router = APIRouter(prefix="/networks", tags=["networks"])


# --- WiFi ---


@router.get("/wifi")
async def list_wifi(
    ssid: str | None = Query(None),
    bssid: str | None = Query(None),
    encryption: str | None = Query(None),
    channel: int | None = Query(None),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    params = WifiSearchParams(
        ssid=ssid, bssid=bssid, encryption=encryption, channel=channel,
        lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max,
        cursor=cursor, limit=limit,
    )
    networks, next_cursor = await search_wifi(db, params)
    return PaginatedResponse(
        results=[WifiNetworkResponse.model_validate(n) for n in networks],
        next_cursor=next_cursor,
    )


@router.get("/wifi/{bssid}", response_model=WifiNetworkResponse)
async def wifi_detail(
    bssid: str = Path(pattern=r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WifiNetwork).where(WifiNetwork.bssid == bssid.upper())
    )
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="WiFi network not found")
    return network


@router.get("/wifi/geojson")
async def wifi_geojson(
    encryption: str | None = Query(None),
    ssid: str | None = Query(None),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    mine_only: bool = Query(False),
    limit: int = Query(10000, ge=1, le=50000),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    discovered_by = user.id if mine_only and user else None
    return await export_geojson(
        db,
        lat_min=lat_min, lat_max=lat_max,
        lon_min=lon_min, lon_max=lon_max,
        encryption=encryption, ssid=ssid,
        discovered_by=discovered_by,
        limit=limit,
    )


@router.get("/wifi/count")
async def wifi_count(
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    encryption: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lightweight count of WiFi networks in a bounding box."""
    query = select(func.count(WifiNetwork.id))
    if lat_min is not None:
        query = query.where(WifiNetwork.latitude >= lat_min)
    if lat_max is not None:
        query = query.where(WifiNetwork.latitude <= lat_max)
    if lon_min is not None:
        query = query.where(WifiNetwork.longitude >= lon_min)
    if lon_max is not None:
        query = query.where(WifiNetwork.longitude <= lon_max)
    if encryption:
        enc_list = [e.strip() for e in encryption.split(",")]
        query = query.where(WifiNetwork.encryption.in_(enc_list))
    count = await db.scalar(query) or 0
    return {"count": count}


# --- Bluetooth ---


@router.get("/bt/geojson")
async def bt_geojson(
    name: str | None = Query(None),
    device_type: str | None = Query(None),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    limit: int = Query(10000, ge=1, le=50000),
    db: AsyncSession = Depends(get_db),
):
    """GeoJSON for Bluetooth devices in viewport."""
    query = select(BtNetwork)
    if lat_min is not None:
        query = query.where(BtNetwork.latitude >= lat_min)
    if lat_max is not None:
        query = query.where(BtNetwork.latitude <= lat_max)
    if lon_min is not None:
        query = query.where(BtNetwork.longitude >= lon_min)
    if lon_max is not None:
        query = query.where(BtNetwork.longitude <= lon_max)
    if name:
        query = query.where(BtNetwork.name.ilike(f"%{name}%"))
    if device_type:
        query = query.where(BtNetwork.device_type == device_type.upper())
    query = query.limit(limit)

    result = await db.execute(query)
    devices = result.scalars().all()

    features = []
    for d in devices:
        if d.latitude is None or d.longitude is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [d.longitude, d.latitude]},
            "properties": {
                "id": d.id,
                "mac": d.mac,
                "name": d.name,
                "device_type": d.device_type,
                "rssi": d.rssi,
                "first_seen": d.first_seen.isoformat() if d.first_seen else None,
                "last_seen": d.last_seen.isoformat() if d.last_seen else None,
            },
        })
    return {"type": "FeatureCollection", "features": features, "truncated": len(devices) >= limit}


@router.get("/bt")
async def list_bt(
    name: str | None = Query(None),
    mac: str | None = Query(None),
    device_type: str | None = Query(None),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    offset: int = Query(0, ge=0),
    cursor: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    params = BtSearchParams(
        name=name, mac=mac, device_type=device_type,
        lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max,
        offset=offset, cursor=cursor, limit=limit,
    )
    networks, next_cursor = await search_bt(db, params)
    total_query = select(func.count(BtNetwork.id))
    if name:
        total_query = total_query.where(BtNetwork.name.ilike(f"%{name}%"))
    if mac:
        total_query = total_query.where(BtNetwork.mac == mac.upper())
    if device_type:
        total_query = total_query.where(BtNetwork.device_type == device_type.upper())
    if lat_min is not None:
        total_query = total_query.where(BtNetwork.latitude >= lat_min)
    if lat_max is not None:
        total_query = total_query.where(BtNetwork.latitude <= lat_max)
    if lon_min is not None:
        total_query = total_query.where(BtNetwork.longitude >= lon_min)
    if lon_max is not None:
        total_query = total_query.where(BtNetwork.longitude <= lon_max)
    total = await db.scalar(total_query) or 0
    return PaginatedResponse(
        results=[BtNetworkResponse.model_validate(n) for n in networks],
        next_cursor=next_cursor,
        total=total,
    )


@router.get("/bt/{mac}", response_model=BtNetworkResponse)
async def bt_detail(
    mac: str = Path(pattern=r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BtNetwork).where(BtNetwork.mac == mac.upper())
    )
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="Bluetooth device not found")
    return network


# --- Cell Towers ---


@router.get("/cell/geojson")
async def cell_geojson(
    radio: str | None = Query(None),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    limit: int = Query(10000, ge=1, le=50000),
    db: AsyncSession = Depends(get_db),
):
    """GeoJSON for cell towers in viewport."""
    query = select(CellTower)
    if lat_min is not None:
        query = query.where(CellTower.latitude >= lat_min)
    if lat_max is not None:
        query = query.where(CellTower.latitude <= lat_max)
    if lon_min is not None:
        query = query.where(CellTower.longitude >= lon_min)
    if lon_max is not None:
        query = query.where(CellTower.longitude <= lon_max)
    if radio:
        query = query.where(CellTower.radio == radio.upper())
    query = query.limit(limit)

    result = await db.execute(query)
    towers = result.scalars().all()

    features = []
    for t in towers:
        if t.latitude is None or t.longitude is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [t.longitude, t.latitude]},
            "properties": {
                "id": t.id,
                "radio": t.radio,
                "mcc": t.mcc,
                "mnc": t.mnc,
                "lac": t.lac,
                "cid": t.cid,
                "rssi": t.rssi,
                "first_seen": t.first_seen.isoformat() if t.first_seen else None,
                "last_seen": t.last_seen.isoformat() if t.last_seen else None,
            },
        })
    return {"type": "FeatureCollection", "features": features, "truncated": len(towers) >= limit}


@router.get("/cell")
async def list_cell(
    radio: str | None = Query(None),
    mcc: int | None = Query(None),
    mnc: int | None = Query(None),
    lac: int | None = Query(None),
    cid: int | None = Query(None),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    offset: int = Query(0, ge=0),
    cursor: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    params = CellSearchParams(
        radio=radio, mcc=mcc, mnc=mnc, lac=lac, cid=cid,
        lat_min=lat_min, lat_max=lat_max, lon_min=lon_min, lon_max=lon_max,
        offset=offset, cursor=cursor, limit=limit,
    )
    towers, next_cursor = await search_cell(db, params)
    total_query = select(func.count(CellTower.id))
    if radio:
        total_query = total_query.where(CellTower.radio == radio.upper())
    if mcc is not None:
        total_query = total_query.where(CellTower.mcc == mcc)
    if mnc is not None:
        total_query = total_query.where(CellTower.mnc == mnc)
    if lac is not None:
        total_query = total_query.where(CellTower.lac == lac)
    if cid is not None:
        total_query = total_query.where(CellTower.cid == cid)
    if lat_min is not None:
        total_query = total_query.where(CellTower.latitude >= lat_min)
    if lat_max is not None:
        total_query = total_query.where(CellTower.latitude <= lat_max)
    if lon_min is not None:
        total_query = total_query.where(CellTower.longitude >= lon_min)
    if lon_max is not None:
        total_query = total_query.where(CellTower.longitude <= lon_max)
    total = await db.scalar(total_query) or 0
    return PaginatedResponse(
        results=[CellTowerResponse.model_validate(t) for t in towers],
        next_cursor=next_cursor,
        total=total,
    )


@router.get("/cell/{tower_id}", response_model=CellTowerResponse)
async def cell_detail(tower_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CellTower).where(CellTower.id == tower_id)
    )
    tower = result.scalar_one_or_none()
    if not tower:
        raise HTTPException(status_code=404, detail="Cell tower not found")
    return tower
