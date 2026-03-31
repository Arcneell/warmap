from datetime import datetime

from pydantic import BaseModel


class UploadResponse(BaseModel):
    transaction_id: int
    status: str


class TransactionStatus(BaseModel):
    id: int
    filename: str
    file_size: int | None
    file_format: str | None
    status: str
    status_message: str | None
    wifi_count: int
    bt_count: int
    ble_count: int
    cell_count: int
    gps_points: int
    new_networks: int
    updated_networks: int
    skipped_networks: int
    xp_earned: int
    uploaded_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class UploadHistoryItem(BaseModel):
    id: int
    filename: str
    file_format: str | None
    status: str
    status_message: str | None
    wifi_count: int
    bt_count: int
    ble_count: int
    cell_count: int
    new_networks: int
    updated_networks: int
    skipped_networks: int
    xp_earned: int
    uploaded_at: datetime
    completed_at: datetime | None
    queue_position: int | None = None
    queue_total: int | None = None

    model_config = {"from_attributes": True}
