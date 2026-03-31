import { authFetch } from '../api.js';
import { $, escapeHtml } from '../utils.js';
import { getState } from '../state.js';

export function initGroups() {
    $('createGroupBtn').addEventListener('click', async () => {
        if (!getState('accessToken')) {
            $('loginModal').classList.add('active');
            return;
        }
        const name = prompt('Group name:');
        if (!name) return;
        const desc = prompt('Description (optional):') || '';
        try {
            const res = await authFetch('/api/v1/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc }),
            });
            if (res.ok) loadGroups();
            else {
                const data = await res.json();
                alert(data.detail || 'Failed to create group');
            }
        } catch (e) { console.error('Create group failed:', e); }
    });
}

export async function loadGroups() {
    try {
        const res = await fetch('/api/v1/groups');
        const groups = await res.json();
        const container = $('groupsList');
        $('groupDetail').style.display = 'none';
        container.style.display = '';

        if (!groups || groups.length === 0) {
            container.innerHTML = '<div style="padding:20px;color:var(--text-secondary);">No groups yet. Create one!</div>';
            return;
        }

        container.innerHTML = `<table class="bt-table"><thead><tr>
            <th>Name</th><th>Description</th><th>Members</th><th></th>
        </tr></thead><tbody>${groups.map(g => `<tr>
            <td><strong>${escapeHtml(g.name)}</strong></td>
            <td>${escapeHtml(g.description || '--')}</td>
            <td>${g.member_count}</td>
            <td><button class="btn btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="window.__viewGroup(${g.id})">View</button></td>
        </tr>`).join('')}</tbody></table>`;
    } catch (e) { console.error('Failed to load groups:', e); }
}

window.__viewGroup = async function(groupId) {
    try {
        const res = await fetch(`/api/v1/groups/${groupId}`);
        const group = await res.json();
        const detail = $('groupDetail');
        $('groupsList').style.display = 'none';
        detail.style.display = '';

        const membersHtml = group.members.map(m => {
            const avatar = m.avatar_url ? `<img src="${m.avatar_url}" style="width:18px;height:18px;border-radius:50%;vertical-align:middle;margin-right:4px;">` : '';
            const roleBadge = m.role === 'admin' ? ' <span class="bt-type-badge ble">admin</span>' : '';
            return `<div style="padding:6px 0;border-bottom:1px solid var(--border);">${avatar}${escapeHtml(m.username)}${roleBadge}</div>`;
        }).join('');

        detail.innerHTML = `<div style="padding:16px;">
            <button class="btn-ghost" onclick="document.getElementById('groupsList').style.display='';document.getElementById('groupDetail').style.display='none';">&larr; Back</button>
            <h3 style="margin:12px 0 4px;">${escapeHtml(group.name)}</h3>
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px;">${escapeHtml(group.description || '')}</p>
            <div style="margin-bottom:16px;">
                ${getState('accessToken') ? `<button class="btn" style="font-size:0.8rem;" onclick="window.__joinGroup(${group.id})">Join Group</button>` : ''}
            </div>
            <h4 style="margin-bottom:8px;">Members (${group.members.length})</h4>
            ${membersHtml}
        </div>`;
    } catch (e) { console.error('Failed to view group:', e); }
};

window.__joinGroup = async function(groupId) {
    try {
        const res = await authFetch(`/api/v1/groups/${groupId}/join`, { method: 'POST' });
        if (res.ok) window.__viewGroup(groupId);
        else {
            const data = await res.json();
            alert(data.detail || 'Failed to join');
        }
    } catch (e) { console.error('Join group failed:', e); }
};
