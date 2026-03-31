import { escapeHtml, $ } from '../utils.js';

let currentUserId = null;

export function setProfileUser(userId) {
    currentUserId = userId;
}

export async function loadProfile() {
    const root = $('profilePageContent');
    if (!root || !currentUserId) {
        if (root) root.innerHTML = '<div class="bt-empty">User not found</div>';
        return;
    }

    try {
        const res = await fetch(`/api/v1/profile/${currentUserId}`);
        if (!res.ok) {
            root.innerHTML = '<div class="bt-empty">User not found</div>';
            return;
        }
        const s = await res.json();
        const badges = s.badges || [];

        const earnedCount = badges.filter(b => b.earned).length;
        const totalCount = badges.length;
        const progressPct = s.xp_needed > 0 ? Math.min(100, Math.round((s.xp_progress / s.xp_needed) * 100)) : 100;
        const isMaxLevel = s.level >= 100;
        const memberSince = s.created_at ? new Date(s.created_at).toLocaleDateString() : '--';

        // Group badges by category
        const categories = {};
        badges.forEach(b => {
            const cat = b.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(b);
        });

        const categoryNames = {
            wifi: 'WiFi Discoveries',
            bluetooth: 'Bluetooth',
            cell: 'Cell Towers',
            upload: 'Uploads',
            xp: 'Experience',
            level: 'Level Milestones',
            special: 'Special'
        };

        const categoryIcons = {
            wifi: '\ud83d\udce1',
            bluetooth: '\ud83d\udd35',
            cell: '\ud83d\udcf6',
            upload: '\ud83d\udce4',
            xp: '\u2b50',
            level: '\ud83c\udfaf',
            special: '\ud83c\udf1f'
        };

        const badgeSectionsHtml = Object.entries(categories).map(([cat, catBadges]) => {
            const badgesHtml = catBadges.map(b => {
                const tierClass = `tier-${b.tier || 1}`;
                const earnedClass = b.earned ? 'earned' : 'locked';
                return `<div class="rpg-badge ${earnedClass} ${tierClass}" title="${escapeHtml(b.description)}">
                    <span class="rpg-badge-icon">${b.icon_emoji || '\ud83c\udfc5'}</span>
                    <span class="rpg-badge-name">${escapeHtml(b.name)}</span>
                </div>`;
            }).join('');
            return `<div class="rpg-badge-category">
                <div class="rpg-badge-category-title">${categoryIcons[cat] || ''} ${categoryNames[cat] || cat}</div>
                <div class="rpg-badge-grid">${badgesHtml}</div>
            </div>`;
        }).join('');

        const avatarHtml = s.avatar_url
            ? `<img src="${s.avatar_url}" class="rpg-profile-avatar" alt="${escapeHtml(s.username)}">`
            : `<div class="rpg-profile-avatar rpg-profile-avatar-placeholder">${escapeHtml((s.username || '?')[0].toUpperCase())}</div>`;

        root.innerHTML = `
            <div class="rpg-profile-hero">
                <div class="rpg-profile-avatar-section">
                    <div class="rpg-level-ring">
                        <svg viewBox="0 0 120 120" class="rpg-level-svg">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(13,147,115,0.15)" stroke-width="6"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" stroke-width="6"
                                stroke-dasharray="${Math.round(339.3 * progressPct / 100)} 339.3"
                                stroke-linecap="round" transform="rotate(-90 60 60)"
                                class="rpg-level-progress"/>
                        </svg>
                        ${avatarHtml}
                        <div class="rpg-level-badge">${s.level}</div>
                    </div>
                    <div class="rpg-profile-info">
                        <div class="rpg-profile-name">${escapeHtml(s.username || '--')}</div>
                        <div class="rpg-profile-rank">${escapeHtml(s.rank || 'Script Kiddie')}</div>
                        <div class="rpg-profile-global-rank">Global #${(s.global_rank || 0).toLocaleString()} \u2022 Member since ${memberSince}</div>
                    </div>
                </div>
                <div class="rpg-xp-section">
                    <div class="rpg-xp-bar-wrap">
                        <div class="rpg-xp-bar">
                            <div class="rpg-xp-bar-fill" style="width:${progressPct}%"></div>
                            <div class="rpg-xp-bar-glow" style="width:${progressPct}%"></div>
                        </div>
                        <div class="rpg-xp-labels">
                            <span>${isMaxLevel ? 'MAX LEVEL' : `${s.xp_progress.toLocaleString()} / ${s.xp_needed.toLocaleString()} XP`}</span>
                            <span>${s.xp.toLocaleString()} XP total</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rpg-stats-grid">
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">\ud83d\udce1</div>
                    <div class="rpg-stat-value">${(s.wifi_discovered || 0).toLocaleString()}</div>
                    <div class="rpg-stat-label">WiFi Networks</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">\ud83d\udd35</div>
                    <div class="rpg-stat-value">${(s.bt_discovered || 0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Bluetooth</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">\ud83d\udcf6</div>
                    <div class="rpg-stat-value">${(s.cell_discovered || 0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Cell Towers</div>
                </div>
                <div class="rpg-stat-card">
                    <div class="rpg-stat-icon">\ud83d\udce4</div>
                    <div class="rpg-stat-value">${(s.total_uploads || 0).toLocaleString()}</div>
                    <div class="rpg-stat-label">Uploads</div>
                </div>
            </div>

            <div class="rpg-badges-section">
                <div class="rpg-badges-header">
                    <h3>Badges</h3>
                    <span class="rpg-badges-count">${earnedCount} / ${totalCount}</span>
                </div>
                ${badgeSectionsHtml}
            </div>
        `;
    } catch (e) {
        console.error('Failed to load profile:', e);
        root.innerHTML = '<div class="bt-empty">Failed to load profile</div>';
    }
}
