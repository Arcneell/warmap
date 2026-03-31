import { authFetch } from '../api.js';
import { escapeHtml, $ } from '../utils.js';

export async function loadMyStats() {
    const root = $('myStatsContent');
    if (!root) return;
    try {
        const res = await authFetch('/api/v1/profile');
        if (!res.ok) {
            root.innerHTML = '<div class="card"><div class="card-title">My Stats</div><div class="bt-empty">Login required</div></div>';
            return;
        }
        const s = await res.json();
        root.innerHTML = `
            <div class="card">
                <div class="card-title">Profile</div>
                <div style="font-size:1.1rem;font-weight:700">${escapeHtml(s.username || '--')}</div>
                <div style="color:var(--text-secondary);margin-top:4px;">Level ${s.level} - ${escapeHtml(s.rank || '--')}</div>
            </div>
            <div class="card">
                <div class="card-title">Progression</div>
                <div>XP: <strong>${(s.xp || 0).toLocaleString()}</strong></div>
                <div>Current level XP: ${(s.xp_current_level || 0).toLocaleString()}</div>
                <div>Next level XP: ${(s.xp_next_level || 0).toLocaleString()}</div>
                <div>Progress: ${(s.xp_progress || 0).toLocaleString()} / ${(s.xp_needed || 0).toLocaleString()}</div>
            </div>
            <div class="card">
                <div class="card-title">Discoveries</div>
                <div>WiFi: <strong>${(s.wifi_discovered || 0).toLocaleString()}</strong></div>
                <div>Bluetooth: <strong>${(s.bt_discovered || 0).toLocaleString()}</strong></div>
                <div>Cell towers: <strong>${(s.cell_discovered || 0).toLocaleString()}</strong></div>
                <div>Uploads: <strong>${(s.total_uploads || 0).toLocaleString()}</strong></div>
            </div>
        `;
    } catch (e) {
        console.error('Failed to load my stats:', e);
        root.innerHTML = '<div class="card"><div class="card-title">My Stats</div><div class="bt-empty">Failed to load stats</div></div>';
    }
}
