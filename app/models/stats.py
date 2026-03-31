from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MonthlyStats(Base):
    __tablename__ = "monthly_stats"
    __table_args__ = (
        UniqueConstraint("user_id", "month", name="uq_monthly_stats_user_month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    month: Mapped[date] = mapped_column(Date, nullable=False)
    wifi_discovered: Mapped[int] = mapped_column(Integer, default=0)
    bt_discovered: Mapped[int] = mapped_column(Integer, default=0)
    cell_discovered: Mapped[int] = mapped_column(Integer, default=0)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int | None] = mapped_column(Integer)
