import base64
import json

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.schemas.network import BtSearchParams, CellSearchParams, WifiSearchParams


async def search_wifi(
    db: AsyncSession, params: WifiSearchParams
) -> tuple[list[WifiNetwork], str | None]:
    query = select(WifiNetwork)

    if params.ssid:
        query = query.where(WifiNetwork.ssid.ilike(f"%{params.ssid}%"))
    if params.bssid:
        query = query.where(WifiNetwork.bssid == params.bssid.upper())
    if params.encryption:
        enc_list = [e.strip() for e in params.encryption.split(",")]
        query = query.where(WifiNetwork.encryption.in_(enc_list))
    if params.channel:
        query = query.where(WifiNetwork.channel == params.channel)
    if params.lat_min is not None:
        query = query.where(WifiNetwork.latitude >= params.lat_min)
    if params.lat_max is not None:
        query = query.where(WifiNetwork.latitude <= params.lat_max)
    if params.lon_min is not None:
        query = query.where(WifiNetwork.longitude >= params.lon_min)
    if params.lon_max is not None:
        query = query.where(WifiNetwork.longitude <= params.lon_max)
    if params.first_seen_after:
        query = query.where(WifiNetwork.first_seen >= params.first_seen_after)
    if params.first_seen_before:
        query = query.where(WifiNetwork.first_seen <= params.first_seen_before)

    if params.cursor:
        cursor_data = _decode_cursor(params.cursor)
        if cursor_data:
            query = query.where(WifiNetwork.id < cursor_data["last_id"])

    query = query.order_by(WifiNetwork.id.desc()).limit(params.limit + 1)

    result = await db.execute(query)
    networks = list(result.scalars().all())

    next_cursor = None
    if len(networks) > params.limit:
        networks = networks[: params.limit]
        next_cursor = _encode_cursor({"last_id": networks[-1].id})

    return networks, next_cursor


async def search_bt(
    db: AsyncSession, params: BtSearchParams
) -> tuple[list[BtNetwork], str | None]:
    query = select(BtNetwork)

    if params.name:
        query = query.where(BtNetwork.name.ilike(f"%{params.name}%"))
    if params.mac:
        query = query.where(BtNetwork.mac == params.mac.upper())
    if params.device_type:
        query = query.where(BtNetwork.device_type == params.device_type.upper())
    if params.lat_min is not None:
        query = query.where(BtNetwork.latitude >= params.lat_min)
    if params.lat_max is not None:
        query = query.where(BtNetwork.latitude <= params.lat_max)
    if params.lon_min is not None:
        query = query.where(BtNetwork.longitude >= params.lon_min)
    if params.lon_max is not None:
        query = query.where(BtNetwork.longitude <= params.lon_max)

    if params.cursor:
        cursor_data = _decode_cursor(params.cursor)
        if cursor_data:
            query = query.where(BtNetwork.id < cursor_data["last_id"])

    query = query.order_by(BtNetwork.id.desc()).limit(params.limit + 1)

    result = await db.execute(query)
    networks = list(result.scalars().all())

    next_cursor = None
    if len(networks) > params.limit:
        networks = networks[: params.limit]
        next_cursor = _encode_cursor({"last_id": networks[-1].id})

    return networks, next_cursor


async def search_cell(
    db: AsyncSession, params: CellSearchParams
) -> tuple[list[CellTower], str | None]:
    query = select(CellTower)

    if params.radio:
        query = query.where(CellTower.radio == params.radio.upper())
    if params.mcc is not None:
        query = query.where(CellTower.mcc == params.mcc)
    if params.mnc is not None:
        query = query.where(CellTower.mnc == params.mnc)
    if params.lac is not None:
        query = query.where(CellTower.lac == params.lac)
    if params.cid is not None:
        query = query.where(CellTower.cid == params.cid)
    if params.lat_min is not None:
        query = query.where(CellTower.latitude >= params.lat_min)
    if params.lat_max is not None:
        query = query.where(CellTower.latitude <= params.lat_max)
    if params.lon_min is not None:
        query = query.where(CellTower.longitude >= params.lon_min)
    if params.lon_max is not None:
        query = query.where(CellTower.longitude <= params.lon_max)

    if params.cursor:
        cursor_data = _decode_cursor(params.cursor)
        if cursor_data:
            query = query.where(CellTower.id < cursor_data["last_id"])

    query = query.order_by(CellTower.id.desc()).limit(params.limit + 1)

    result = await db.execute(query)
    towers = list(result.scalars().all())

    next_cursor = None
    if len(towers) > params.limit:
        towers = towers[: params.limit]
        next_cursor = _encode_cursor({"last_id": towers[-1].id})

    return towers, next_cursor


def _encode_cursor(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()


def _decode_cursor(cursor: str) -> dict | None:
    try:
        return json.loads(base64.urlsafe_b64decode(cursor))
    except Exception:
        return None
