import { $ } from '../utils.js';

const PAGE_SIZE = 100;
let currentOffset = 0;

export function initCell() {
    let timeout;
    $('cellSearch').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            currentOffset = 0;
            loadCellTowers();
        }, 400);
    });
    $('cellRadioFilter').addEventListener('change', () => {
        currentOffset = 0;
        loadCellTowers();
    });
    const prevBtn = $('cellPrev');
    const nextBtn = $('cellNext');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
        loadCellTowers();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentOffset += PAGE_SIZE;
        loadCellTowers();
    });
}

export async function loadCellTowers() {
    try {
        const radio = $('cellRadioFilter').value;
        const params = new URLSearchParams();
        if (radio) params.set('radio', radio);
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(currentOffset));

        const res = await fetch('/api/v1/networks/cell?' + params);
        const data = await res.json();
        const towers = data.results || [];
        const total = data.total || 0;
        $('cellTotal').textContent = total;

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
        const pageInfo = $('cellPageInfo');
        const prevBtn = $('cellPrev');
        const nextBtn = $('cellNext');
        if (pageInfo) pageInfo.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1}`;
        if (prevBtn) prevBtn.disabled = currentOffset === 0;
        if (nextBtn) nextBtn.disabled = currentOffset + PAGE_SIZE >= total;
    } catch (e) {
        console.error('Failed to load cell towers:', e);
    }
}
