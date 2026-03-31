import { $, escapeHtml } from '../utils.js';

const PAGE_SIZE = 50;
let currentOffset = 0;

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
                ? `<img src="${u.avatar_url}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:6px;">`
                : '';
            const topClass = u.rank === 1 ? 'lb-top1' : (u.rank === 2 ? 'lb-top2' : (u.rank === 3 ? 'lb-top3' : ''));
            return `<tr class="${topClass}">
                <td><strong>${u.rank}</strong></td>
                <td>${avatar}${escapeHtml(u.username)}</td>
                <td>Lvl ${u.level}</td>
                <td>${(u.xp || 0).toLocaleString()}</td>
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
