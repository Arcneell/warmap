import { $ } from '../utils.js';

export function initCell() {
    let timeout;
    $('cellSearch').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadCellTowers, 400);
    });
    $('cellRadioFilter').addEventListener('change', loadCellTowers);
}

export async function loadCellTowers() {
    try {
        const radio = $('cellRadioFilter').value;
        const params = new URLSearchParams();
        if (radio) params.set('radio', radio);
        params.set('limit', '500');

        const res = await fetch('/api/v1/networks/cell?' + params);
        const data = await res.json();
        const towers = data.results || [];
        $('cellTotal').textContent = towers.length;

        const tbody = $('cellTableBody');
        if (towers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="bt-empty">No cell towers found</td></tr>';
            return;
        }

        tbody.innerHTML = towers.map(t => {
            const radioCls = (t.radio === 'LTE' || t.radio === 'NR') ? 'ble' : 'bt';
            const lat = t.latitude ? t.latitude.toFixed(4) : '--';
            const lon = t.longitude ? t.longitude.toFixed(4) : '--';
            return `<tr>
                <td><span class="bt-type-badge ${radioCls}">${t.radio}</span></td>
                <td>${t.mcc}</td><td>${t.mnc}</td><td>${t.lac || '--'}</td><td>${t.cid}</td>
                <td><span class="bt-signal">${t.rssi} dBm</span></td>
                <td><span class="bt-coords">${lat}, ${lon}</span></td>
                <td><span class="bt-date">${t.first_seen || '--'}</span></td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load cell towers:', e);
    }
}
