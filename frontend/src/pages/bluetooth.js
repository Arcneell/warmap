import { $, escapeHtml } from '../utils.js';

export function initBluetooth() {
    let timeout;
    $('btSearch').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(loadBluetooth, 400);
    });
}

export async function loadBluetooth() {
    try {
        const search = $('btSearch').value.trim();
        const params = new URLSearchParams();
        if (search) params.set('name', search);

        const res = await fetch('/api/v1/networks/bt?' + params);
        const data = await res.json();
        const devices = data.results || [];

        $('btTotal').textContent = devices.length;

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
    } catch (e) {
        console.error('Failed to load bluetooth:', e);
    }
}
