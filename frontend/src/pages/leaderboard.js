import { $, escapeHtml } from '../utils.js';

export function initLeaderboard() {
    $('lbSortBy').addEventListener('change', loadLeaderboard);
}

export async function loadLeaderboard() {
    try {
        const sortBy = $('lbSortBy').value;
        const res = await fetch(`/api/v1/stats/leaderboard?sort_by=${sortBy}&limit=50`);
        const data = await res.json();
        const tbody = $('lbTableBody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="bt-empty">No users yet</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(u => {
            const avatar = u.avatar_url
                ? `<img src="${u.avatar_url}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:6px;">`
                : '';
            return `<tr>
                <td><strong>${u.rank}</strong></td>
                <td>${avatar}${escapeHtml(u.username)}</td>
                <td>Lvl ${u.level}</td>
                <td>${(u.xp || 0).toLocaleString()}</td>
                <td>${(u.wifi_discovered || 0).toLocaleString()}</td>
                <td>${(u.bt_discovered || 0).toLocaleString()}</td>
                <td>${(u.cell_discovered || 0).toLocaleString()}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load leaderboard:', e);
    }
}
