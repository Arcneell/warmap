from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class UploadTransaction(Base):
    __tablename__ = "upload_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[int | None] = mapped_column(BigInteger)
    file_format: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    status_message: Mapped[str | None] = mapped_column(Text)
    wifi_count: Mapped[int] = mapped_column(Integer, default=0)
    bt_count: Mapped[int] = mapped_column(Integer, default=0)
    ble_count: Mapped[int] = mapped_column(Integer, default=0)
    cell_count: Mapped[int] = mapped_column(Integer, default=0)
    gps_points: Mapped[int] = mapped_column(Integer, default=0)
    new_networks: Mapped[int] = mapped_column(Integer, default=0)
    updated_networks: Mapped[int] = mapped_column(Integer, default=0)
    skipped_networks: Mapped[int] = mapped_column(Integer, default=0)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="transactions")

    def __repr__(self) -> str:
        return f"<UploadTransaction {self.id} ({self.status})>"


from app.models.user import User  # noqa: E402, F811
