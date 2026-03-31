from pydantic import BaseModel


class GlobalStats(BaseModel):
    total_wifi: int
    total_bt: int
    total_cell: int
    total_users: int
    total_uploads: int
    by_encryption: dict[str, int]
    top_ssids: list[dict]


class UserStats(BaseModel):
    user_id: int
    username: str
    xp: int
    level: int
    rank: str
    wifi_discovered: int
    bt_discovered: int
    cell_discovered: int
    total_uploads: int
    xp_current_level: int
    xp_next_level: int
    xp_progress: int
    xp_needed: int


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: str | None
    wifi_discovered: int
    bt_discovered: int
    cell_discovered: int
    xp: int
    level: int


class ProfileUpdate(BaseModel):
    username: str
