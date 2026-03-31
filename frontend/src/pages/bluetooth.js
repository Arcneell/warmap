import { $, escapeHtml } from '../utils.js';

const PAGE_SIZE = 100;
let currentOffset = 0;

export function initBluetooth() {
    let timeout;
    $('btSearch').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            currentOffset = 0;
            loadBluetooth();
        }, 400);
    });
    const prevBtn = $('btPrev');
    const nextBtn = $('btNext');
    if (prevBtn) prevBtn.addEventListener('click', () => {
        currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
        loadBluetooth();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        currentOffset += PAGE_SIZE;
        loadBluetooth();
    });
}

export async function loadBluetooth() {
    try {
        const search = $('btSearch').value.trim();
        const params = new URLSearchParams();
        if (search) params.set('name', search);
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(currentOffset));

        const res = await fetch('/api/v1/networks/bt?' + params);
        const data = await res.json();
        const devices = data.results || [];
        const total = data.total || 0;

        $('btTotal').textContent = total;

        const tbody = $('btTableBody');
        if (devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="bt-empty">No Bluetooth devices found</td></tr>';
            return;
        }

        tbody.innerHTML = devices.map(d => {
            const typeCls = d.device_type === 'BLE' ? 'ble' : 'bt';
            const name = d.name ? `<span class="bt-name">${escapeHtml(d.name)}</span>` : `<span class="bt-name empty">unnamed</span>`;
            const lat = d.latitude ? d.latitude.toFixed(4) : '--';
            const lon = d.longitude ? d.longitude.toFixed(4) : '--';
            return `<tr>
                <td>${name}</td>
                <td><span class="bt-mac">${escapeHtml(d.mac)}</span></td>
                <td><span class="bt-type-badge ${typeCls}">${d.device_type}</span></td>
                <td><span class="bt-signal">${d.rssi} dBm</span></td>
                <td><span class="bt-coords">${lat}, ${lon}</span></td>
                <td><span class="bt-date">${d.first_seen || '--'}</span></td>
                <td><span class="bt-date">${d.last_seen || '--'}</span></td>
            </tr>`;
        }).join('');
        const pageInfo = $('btPageInfo');
        const prevBtn = $('btPrev');
        const nextBtn = $('btNext');
        if (pageInfo) pageInfo.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1}`;
        if (prevBtn) prevBtn.disabled = currentOffset === 0;
        if (nextBtn) nextBtn.disabled = currentOffset + PAGE_SIZE >= total;
    } catch (e) {
        console.error('Failed to load bluetooth:', e);
    }
}
