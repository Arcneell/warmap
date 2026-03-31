import { $, escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import { setProfileUser } from './profile.js';

const PAGE_SIZE = 50;
let currentOffset = 0;

const RANK_ICONS = {
    1: '\ud83e\udd47',
    2: '\ud83e\udd48',
    3: '\ud83e\udd49',
};

export function initLeaderboard() {
    $('lbSortBy').addEventListener('change', loadLeaderboard);
    const prevBtn = $('lbPrev');
    const nextBtn = $('lbNext');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
        loadLeaderboard();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentOffset += PAGE_SIZE;
        loadLeaderboard();
    });
}

function viewProfile(userId) {
    setProfileUser(userId);
    navigate('#profile');
}

// Expose to window for onclick handlers
window._viewProfile = viewProfile;

export async function loadLeaderboard() {
    try {
        const sortBy = $('lbSortBy').value;
        const res = await fetch(`/api/v1/stats/leaderboard?sort_by=${sortBy}&limit=${PAGE_SIZE}&offset=${currentOffset}`);
        const data = await res.json();
        const tbody = $('lbTableBody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="bt-empty">No users yet</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(u => {
            const avatar = u.avatar_url
                ? `<img src="${u.avatar_url}" class="lb-avatar">`
                : `<div class="lb-avatar lb-avatar-placeholder">${escapeHtml((u.username || '?')[0].toUpperCase())}</div>`;
            const topClass = u.rank === 1 ? 'lb-top1' : (u.rank === 2 ? 'lb-top2' : (u.rank === 3 ? 'lb-top3' : ''));
            const rankIcon = RANK_ICONS[u.rank] || `#${u.rank}`;
            const rankTitle = u.rank_title || '';
            return `<tr class="${topClass} lb-row-clickable" onclick="window._viewProfile(${u.user_id})">
                <td class="lb-rank-cell"><span class="lb-rank-icon">${rankIcon}</span></td>
                <td class="lb-user-cell">
                    ${avatar}
                    <div class="lb-user-info">
                        <span class="lb-username">${escapeHtml(u.username)}</span>
                        <span class="lb-rank-title">${escapeHtml(rankTitle)}</span>
                    </div>
                </td>
                <td><span class="lb-level-badge">Lvl ${u.level}</span></td>
                <td class="lb-xp">${(u.xp || 0).toLocaleString()}</td>
                <td>${(u.wifi_discovered || 0).toLocaleString()}</td>
                <td>${(u.bt_discovered || 0).toLocaleString()}</td>
                <td>${(u.cell_discovered || 0).toLocaleString()}</td>
            </tr>`;
        }).join('');
        const pageInfo = $('lbPageInfo');
        const prevBtn = $('lbPrev');
        const nextBtn = $('lbNext');
        if (pageInfo) pageInfo.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1}`;
        if (prevBtn) prevBtn.disabled = currentOffset === 0;
        if (nextBtn) nextBtn.disabled = !data || data.length < PAGE_SIZE;
    } catch (e) {
        console.error('Failed to load leaderboard:', e);
    }
}
