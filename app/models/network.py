from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import MACADDR

from app.models.base import Base


class WifiNetwork(Base):
    __tablename__ = "wifi_networks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    bssid: Mapped[str] = mapped_column(String(17), unique=True, nullable=False, index=True)
    ssid: Mapped[str] = mapped_column(Text, default="")
    encryption: Mapped[str] = mapped_column(String(16), default="Unknown", index=True)
    channel: Mapped[int] = mapped_column(SmallInteger, default=0)
    frequency: Mapped[int] = mapped_column(Integer, default=0)
    rssi: Mapped[int] = mapped_column(SmallInteger, default=-100)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    altitude: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    seen_count: Mapped[int] = mapped_column(Integer, default=1)
    discovered_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    last_updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    observations: Mapped[list["WifiObservation"]] = relationship(
        back_populates="network", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<WifiNetwork {self.bssid} ({self.ssid})>"


class BtNetwork(Base):
    __tablename__ = "bt_networks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    mac: Mapped[str] = mapped_column(String(17), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, default="")
    device_type: Mapped[str] = mapped_column(String(8), nullable=False)  # BT or BLE
    rssi: Mapped[int] = mapped_column(SmallInteger, default=-100)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    seen_count: Mapped[int] = mapped_column(Integer, default=1)
    discovered_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    def __repr__(self) -> str:
        return f"<BtNetwork {self.mac} ({self.name})>"


class CellTower(Base):
    __tablename__ = "cell_towers"
    __table_args__ = (
        UniqueConstraint("radio", "mcc", "mnc", "lac", "cid", name="uq_cell_identity"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    radio: Mapped[str] = mapped_column(String(8), nullable=False)  # GSM, CDMA, LTE, WCDMA, NR
    mcc: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    mnc: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    lac: Mapped[int | None] = mapped_column(Integer)
    cid: Mapped[int] = mapped_column(BigInteger, nullable=False)
    psc: Mapped[int | None] = mapped_column(Integer)
    rssi: Mapped[int] = mapped_column(SmallInteger, default=-100)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    seen_count: Mapped[int] = mapped_column(Integer, default=1)
    discovered_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    def __repr__(self) -> str:
        return f"<CellTower {self.radio} {self.mcc}:{self.mnc}:{self.lac}:{self.cid}>"


# Import for relationship resolution
from app.models.observation import WifiObservation  # noqa: E402
