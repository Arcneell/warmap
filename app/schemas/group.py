from datetime import datetime

from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str
    description: str | None = None


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_by: int | None
    created_at: datetime
    member_count: int = 0

    model_config = {"from_attributes": True}


class GroupMemberResponse(BaseModel):
    user_id: int
    username: str
    avatar_url: str | None
    role: str
    joined_at: datetime
