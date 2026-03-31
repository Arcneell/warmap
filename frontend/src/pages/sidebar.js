import { $, escapeHtml } from '../utils.js';
import { authFetch } from '../api.js';
import { getState } from '../state.js';
import { ENC_COLORS } from './map.js';

let encChart = null;

export async function loadProfile() {
    // Profile info comes from auth/me when logged in
    const user = getState('currentUser');
    if (!user) {
        // Not logged in -- show pseudo modal for backward compat
        // or just hide profile card
        $('profileCard').style.display = 'none';
        return;
    }
    // Fetch full stats for the user
    try {
        const res = await authFetch('/api/v1/profile');
        if (!res.ok) return;
        const data = await res.json();
        updateProfileUI(data);
    } catch (e) {
        console.error('Failed to load profile:', e);
    }
}

export function updateProfileUI(data) {
    $('profileCard').style.display = '';
    $('profilePseudo').textContent = data.username;
    $('profileRank').textContent = data.rank;
    $('xpLevel').textContent = 'Lvl ' + data.level;
    $('xpText').textContent = data.xp_progress + ' / ' + data.xp_needed + ' XP';
    $('xpTotal').textContent = (data.xp || 0).toLocaleString() + ' XP total';
    const pct = data.xp_needed > 0 ? Math.min(100, (data.xp_progress / data.xp_needed) * 100) : 0;
    $('xpBarFill').style.width = pct + '%';
}

export async function loadStats() {
    try {
        const res = await fetch('/api/v1/stats');
        const data = await res.json();

        $('totalAps').textContent = (data.total_wifi || 0).toLocaleString();

        const labels = Object.keys(ENC_COLORS);
        const values = labels.map(l => (data.by_encryption || {})[l] || 0);
        const colors = labels.map(l => ENC_COLORS[l]);

        const ctx = $('encChart').getContext('2d');
        if (encChart) encChart.destroy();
        encChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#6b7280', padding: 10, font: { family: 'JetBrains Mono', size: 11 }, usePointStyle: true, pointStyleWidth: 8 },
                    },
                },
            },
        });

        const list = $('topSsidList');
        const topSsids = data.top_ssids || [];
        if (topSsids.length === 0) {
            list.innerHTML = '<li><span class="ssid-name">No data</span></li>';
        } else {
            list.innerHTML = topSsids.map(s => `<li><span class="ssid-name">${escapeHtml(s.ssid)}</span><span class="ssid-count">${s.count}</span></li>`).join('');
        }

        $('totalSessions').textContent = data.total_uploads || 0;
        $('lastSession').textContent = '--';

        loadSessions();
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

async function loadSessions() {
    if (!getState('accessToken')) return;
    try {
        const res = await authFetch('/api/v1/upload?limit=20');
        if (!res.ok) return;
        const sessions = await res.json();
        const bar = $('sessionBar');
        if (sessions.length === 0) { bar.innerHTML = ''; return; }

        $('lastSession').textContent = sessions[0]?.uploaded_at
            ? new Date(sessions[0].uploaded_at).toLocaleString() : '--';

        const maxAp = Math.max(...sessions.map(s => (s.new_networks || 0) + (s.updated_networks || 0)), 1);
        const recent = sessions.slice(0, 20).reverse();
        bar.innerHTML = recent.map(s => {
            const count = (s.new_networks || 0) + (s.updated_networks || 0);
            const h = Math.max(4, (count / maxAp) * 36);
            return `<div class="session-bar-item" style="height:${h}px" title="${s.filename}: ${s.new_networks} new, +${s.xp_earned} XP"></div>`;
        }).join('');
    } catch (e) {}
}

export function setupProfileListeners() {
    // The pseudo modal is now replaced by OAuth login
    // If user clicks "Start Wardriving" without being logged in, open login
    const pseudoSubmit = $('pseudoSubmit');
    if (pseudoSubmit) {
        pseudoSubmit.addEventListener('click', () => {
            $('pseudoModal').classList.remove('active');
            $('loginModal').classList.add('active');
        });
    }
}
