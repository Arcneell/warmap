from datetime import datetime

from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ApiTokenCreate(BaseModel):
    name: str
    expires_in_days: int | None = None


class ApiTokenResponse(BaseModel):
    id: int
    name: str
    token: str | None = None  # Only returned on creation
    last_used: datetime | None
    expires_at: datetime | None
    created_at: datetime
    revoked: bool


class ApiTokenListItem(BaseModel):
    id: int
    name: str
    last_used: datetime | None
    expires_at: datetime | None
    created_at: datetime
    revoked: bool


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    avatar_url: str | None
    xp: int
    level: int
    rank: str
    created_at: datetime
    last_login: datetime | None
    is_admin: bool

    model_config = {"from_attributes": True}
