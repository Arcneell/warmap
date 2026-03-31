from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class BadgeDefinition(Base):
    __tablename__ = "badge_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon_svg: Mapped[str | None] = mapped_column(Text)
    icon_emoji: Mapped[str | None] = mapped_column(String(8))
    category: Mapped[str | None] = mapped_column(String(32))
    tier: Mapped[int | None] = mapped_column(Integer, default=1)
    criteria_type: Mapped[str | None] = mapped_column(String(32))
    criteria_value: Mapped[int | None] = mapped_column(Integer)

    def __repr__(self) -> str:
        return f"<BadgeDefinition {self.slug}>"


class UserBadge(Base):
    __tablename__ = "user_badges"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    badge_id: Mapped[int] = mapped_column(
        ForeignKey("badge_definitions.id"), primary_key=True
    )
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="badges")
    badge: Mapped["BadgeDefinition"] = relationship()

    def __repr__(self) -> str:
        return f"<UserBadge user={self.user_id} badge={self.badge_id}>"
