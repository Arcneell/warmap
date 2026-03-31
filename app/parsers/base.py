from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class NetworkObservation:
    network_type: str  # 'wifi', 'bt', 'ble', 'cell'
    identifier: str  # BSSID for wifi/bt, composite key for cell
    name: str = ""  # SSID, BT name, or operator name
    encryption: str | None = None
    channel: int | None = None
    frequency: int | None = None
    rssi: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    altitude: float | None = None
    accuracy: float | None = None
    seen_at: datetime | None = None
    # Cell-specific
    radio: str | None = None  # GSM, LTE, etc.
    mcc: int | None = None
    mnc: int | None = None
    lac: int | None = None
    cid: int | None = None


class BaseParser(ABC):
    @abstractmethod
    def parse(self, content: bytes, filename: str) -> list[NetworkObservation]:
        """Parse file content and return normalized observations."""
        ...
