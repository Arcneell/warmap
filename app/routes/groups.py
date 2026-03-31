from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.group import Group, GroupMember
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.user import User
from app.schemas.group import GroupCreate, GroupMemberResponse, GroupResponse
from app.services.xp import level_from_xp

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("")
async def list_groups(db: AsyncSession = Depends(get_db)):
    """List all groups."""
    result = await db.execute(
        select(Group, func.count(GroupMember.user_id).label("member_count"))
        .outerjoin(GroupMember)
        .group_by(Group.id)
        .order_by(Group.name)
    )
    groups = []
    for group, member_count in result.all():
        groups.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "created_by": group.created_by,
            "created_at": group.created_at,
            "member_count": member_count,
        })
    return groups


@router.post("", response_model=GroupResponse)
async def create_group(
    body: GroupCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new group."""
    existing = await db.execute(select(Group).where(Group.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Group name already taken")

    group = Group(
        name=body.name,
        description=body.description,
        created_by=user.id,
    )
    db.add(group)
    await db.flush()

    # Creator becomes admin
    member = GroupMember(group_id=group.id, user_id=user.id, role="admin")
    db.add(member)
    await db.commit()
    await db.refresh(group)

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        created_at=group.created_at,
        member_count=1,
    )


@router.get("/{group_id}")
async def group_detail(group_id: int, db: AsyncSession = Depends(get_db)):
    """Get group details with members."""
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members_result = await db.execute(
        select(GroupMember, User)
        .join(User, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group_id)
    )

    members = []
    for gm, user in members_result.all():
        members.append(GroupMemberResponse(
            user_id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
            role=gm.role,
            joined_at=gm.joined_at,
        ))

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "members": members,
    }


@router.post("/{group_id}/join")
async def join_group(
    group_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a group."""
    result = await db.execute(select(Group).where(Group.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a member")

    member = GroupMember(group_id=group_id, user_id=user.id, role="member")
    db.add(member)
    await db.commit()
    return {"message": "Joined group"}


@router.get("/{group_id}/leaderboard")
async def group_leaderboard(
    group_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get leaderboard for a group's members."""
    result = await db.execute(select(Group).where(Group.id == group_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found")

    members_result = await db.execute(
        select(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group_id)
        .order_by(User.xp.desc())
    )
    users = members_result.scalars().all()

    leaderboard = []
    for i, u in enumerate(users):
        wifi = await db.scalar(
            select(func.count(WifiNetwork.id)).where(WifiNetwork.discovered_by == u.id)
        ) or 0
        bt = await db.scalar(
            select(func.count(BtNetwork.id)).where(BtNetwork.discovered_by == u.id)
        ) or 0
        cell = await db.scalar(
            select(func.count(CellTower.id)).where(CellTower.discovered_by == u.id)
        ) or 0

        leaderboard.append({
            "rank": i + 1,
            "user_id": u.id,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "xp": u.xp,
            "level": level_from_xp(u.xp),
            "wifi_discovered": wifi,
            "bt_discovered": bt,
            "cell_discovered": cell,
        })

    return leaderboard


@router.delete("/{group_id}/leave")
async def leave_group(
    group_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Leave a group."""
    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id, GroupMember.user_id == user.id
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Not a member")

    await db.delete(member)
    await db.commit()
    return {"message": "Left group"}
