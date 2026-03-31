from datetime import datetime

from pydantic import BaseModel


class WifiSearchParams(BaseModel):
    ssid: str | None = None
    bssid: str | None = None
    encryption: str | None = None
    channel: int | None = None
    lat_min: float | None = None
    lat_max: float | None = None
    lon_min: float | None = None
    lon_max: float | None = None
    first_seen_after: datetime | None = None
    first_seen_before: datetime | None = None
    cursor: str | None = None
    limit: int = 100


class WifiNetworkResponse(BaseModel):
    id: int
    bssid: str
    ssid: str
    encryption: str
    channel: int
    frequency: int
    rssi: int
    latitude: float | None
    longitude: float | None
    first_seen: datetime
    last_seen: datetime
    seen_count: int

    model_config = {"from_attributes": True}


class BtSearchParams(BaseModel):
    name: str | None = None
    mac: str | None = None
    device_type: str | None = None  # BT or BLE
    lat_min: float | None = None
    lat_max: float | None = None
    lon_min: float | None = None
    lon_max: float | None = None
    offset: int = 0
    cursor: str | None = None
    limit: int = 100


class BtNetworkResponse(BaseModel):
    id: int
    mac: str
    name: str
    device_type: str
    rssi: int
    latitude: float | None
    longitude: float | None
    first_seen: datetime
    last_seen: datetime
    seen_count: int

    model_config = {"from_attributes": True}


class CellSearchParams(BaseModel):
    radio: str | None = None
    mcc: int | None = None
    mnc: int | None = None
    lac: int | None = None
    cid: int | None = None
    lat_min: float | None = None
    lat_max: float | None = None
    lon_min: float | None = None
    lon_max: float | None = None
    offset: int = 0
    cursor: str | None = None
    limit: int = 100


class CellTowerResponse(BaseModel):
    id: int
    radio: str
    mcc: int
    mnc: int
    lac: int | None
    cid: int
    rssi: int
    latitude: float | None
    longitude: float | None
    first_seen: datetime
    last_seen: datetime
    seen_count: int

    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    results: list
    next_cursor: str | None = None
    total: int | None = None
