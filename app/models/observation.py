from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WifiObservation(Base):
    __tablename__ = "wifi_observations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    network_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("wifi_networks.id", ondelete="CASCADE"), index=True
    )
    transaction_id: Mapped[int | None] = mapped_column(
        ForeignKey("upload_transactions.id", ondelete="CASCADE")
    )
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    rssi: Mapped[int | None] = mapped_column(SmallInteger)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    altitude: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    network: Mapped["WifiNetwork"] = relationship(back_populates="observations")

    def __repr__(self) -> str:
        return f"<WifiObservation network={self.network_id} rssi={self.rssi}>"


# Avoid circular import - WifiNetwork is imported at module level in network.py
from app.models.network import WifiNetwork  # noqa: E402, F811
