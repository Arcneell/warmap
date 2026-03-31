import { escapeHtml, $ } from '../utils.js';

function kvTable(title, obj) {
    const entries = Object.entries(obj || {});
    if (!entries.length) {
        return `<div class="card"><div class="card-title">${escapeHtml(title)}</div><div class="bt-empty">No data</div></div>`;
    }
    const rows = entries
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 20)
        .map(([k, v]) => `<tr><td>${escapeHtml(String(k))}</td><td>${Number(v).toLocaleString()}</td></tr>`)
        .join('');
    return `<div class="card">
        <div class="card-title">${escapeHtml(title)}</div>
        <table class="bt-table"><tbody>${rows}</tbody></table>
    </div>`;
}

export async function loadAdvancedStats() {
    const root = $('advancedStatsContent');
    if (!root) return;
    try {
        const [channelsRes, encryptionRes, manufacturersRes, countriesRes, topSsidsRes] = await Promise.all([
            fetch('/api/v1/stats/channels'),
            fetch('/api/v1/stats/encryption'),
            fetch('/api/v1/stats/manufacturers?limit=30'),
            fetch('/api/v1/stats/countries'),
            fetch('/api/v1/stats/top-ssids?limit=20'),
        ]);

        const channels = channelsRes.ok ? await channelsRes.json() : {};
        const encryption = encryptionRes.ok ? await encryptionRes.json() : {};
        const manufacturers = manufacturersRes.ok ? await manufacturersRes.json() : {};
        const countries = countriesRes.ok ? await countriesRes.json() : {};
        const topSsids = topSsidsRes.ok ? await topSsidsRes.json() : [];

        const ssidRows = (topSsids || [])
            .map((s) => `<tr><td>${escapeHtml(s.ssid || '<hidden>')}</td><td>${(s.count || 0).toLocaleString()}</td></tr>`)
            .join('');
        const countriesObj = countries.by_cell_mcc || {};

        root.innerHTML = `
            ${kvTable('Channels', channels)}
            ${kvTable('Encryption Distribution', encryption)}
            ${kvTable('Top Manufacturers (OUI)', manufacturers)}
            ${kvTable('Countries (Cell MCC)', countriesObj)}
            <div class="card">
                <div class="card-title">Top SSIDs</div>
                <table class="bt-table"><tbody>${ssidRows || '<tr><td colspan="2" class="bt-empty">No data</td></tr>'}</tbody></table>
            </div>
        `;
    } catch (e) {
        console.error('Failed to load advanced stats:', e);
        root.innerHTML = '<div class="card"><div class="card-title">Advanced Stats</div><div class="bt-empty">Failed to load advanced stats</div></div>';
    }
}
