// ─── Config ──────────────────────────────────────────────
const ENC_COLORS = {
    WPA3: '#0d9373',
    WPA2: '#3b82f6',
    WPA: '#e07832',
    WEP: '#dc3545',
    Open: '#9ca3af',
    Unknown: '#d1d5db',
};

// ─── Map ─────────────────────────────────────────────────
const map = L.map('map', { zoomControl: true }).setView([0, 0], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
}).addTo(map);

if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
        (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// Clustering at low zoom, individual markers at high zoom (>=17)
const markersLayer = L.markerClusterGroup({
    maxClusterRadius: 40,
    disableClusteringAtZoom: 17,
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    chunkedLoading: true,
});
map.addLayer(markersLayer);
let currentFeatures = [];

// ─── Heatmap ─────────────────────────────────────────────
let heatLayer = null;
let viewMode = 'markers';

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('btnViewMarkers').classList.toggle('active', mode === 'markers');
    document.getElementById('btnViewHeat').classList.toggle('active', mode === 'heat');
    if (mode === 'markers') {
        if (heatLayer) map.removeLayer(heatLayer);
        map.addLayer(markersLayer);
    } else {
        map.removeLayer(markersLayer);
        if (heatLayer) map.addLayer(heatLayer);
    }
}

document.getElementById('btnViewMarkers').addEventListener('click', () => setViewMode('markers'));
document.getElementById('btnViewHeat').addEventListener('click', () => setViewMode('heat'));

let encChart = null;

// ─── Overlapping AP detection ────────────────────────────
function findOverlapping(targetFeature) {
    const [tLng, tLat] = targetFeature.geometry.coordinates;
    const threshold = 0.00008; // ~8m
    return currentFeatures.filter(f => {
        const [lng, lat] = f.geometry.coordinates;
        return Math.abs(lat - tLat) < threshold && Math.abs(lng - tLng) < threshold;
    });
}

function buildPopupContent(features, activeIndex) {
    const total = features.length;
    const multi = total > 1;

    let html = '<div class="popup-multi">';
    if (multi) {
        html += `<div class="popup-nav">
            <button class="popup-nav-btn" onclick="popupNav(-1)">&larr;</button>
            <span class="popup-nav-count"><span id="popupIdx">${activeIndex + 1}</span> / ${total}</span>
            <button class="popup-nav-btn" onclick="popupNav(1)">&rarr;</button>
        </div>`;
    }

    features.forEach((f, i) => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const encColor = ENC_COLORS[p.encryption] || ENC_COLORS.Unknown;
        const display = (multi && i !== activeIndex) ? 'none' : 'block';
        const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        html += `<div class="popup-ap" data-popup-idx="${i}" style="display:${display}">
            <div><span class="popup-label">SSID:</span> ${escapeHtml(p.ssid) || '<i>hidden</i>'}</div>
            <div><span class="popup-label">BSSID:</span> ${escapeHtml(p.bssid)}</div>
            <div><span class="popup-label">Encryption:</span> <span class="popup-enc" style="background:${encColor}20;color:${encColor}">${p.encryption}</span></div>
            <div><span class="popup-label">Channel:</span> ${p.channel}</div>
            <div><span class="popup-label">Signal:</span> ${p.rssi} dBm</div>
            <div><span class="popup-label">GPS:</span> <a href="${gmapsUrl}" target="_blank" class="popup-gps">${lat.toFixed(5)}, ${lng.toFixed(5)}</a></div>
            <div><span class="popup-label">First seen:</span> ${p.first_seen}</div>
            <div><span class="popup-label">Last seen:</span> ${p.last_seen}</div>
        </div>`;
    });

    html += '</div>';
    return html;
}

// Global navigation state for popup
let popupFeatures = [];
let popupIndex = 0;
let activePopup = null;

window.popupNav = function(dir) {
    if (!popupFeatures.length || !activePopup) return;
    popupIndex = (popupIndex + dir + popupFeatures.length) % popupFeatures.length;

    // Toggle visibility directly in the DOM — no setContent, no close/reopen
    const wrapper = activePopup.getElement();
    if (!wrapper) return;
    wrapper.querySelectorAll('.popup-ap').forEach(el => {
        el.style.display = parseInt(el.dataset.popupIdx) === popupIndex ? 'block' : 'none';
    });
    const idx = wrapper.querySelector('#popupIdx');
    if (idx) idx.textContent = popupIndex + 1;

    // Always move popup to the AP's real position and pan the map
    const f = popupFeatures[popupIndex];
    const [lng, lat] = f.geometry.coordinates;
    const newLatLng = L.latLng(lat, lng);
    activePopup.setLatLng(newLatLng);
    map.panTo(newLatLng, { animate: true, duration: 0.25 });
};

// ─── Profile ─────────────────────────────────────────────
async function checkProfile() {
    try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (!data.exists) {
            document.getElementById('pseudoModal').classList.add('active');
        } else {
            updateProfileUI(data);
        }
    } catch (e) {
        console.error('Failed to check profile:', e);
    }
}

function updateProfileUI(data) {
    document.getElementById('profileCard').style.display = '';
    document.getElementById('headerProfile').style.display = '';

    document.getElementById('profilePseudo').textContent = data.pseudo;
    document.getElementById('profileRank').textContent = data.rank;
    document.getElementById('headerPseudo').textContent = data.pseudo;
    document.getElementById('headerLevel').textContent = 'Lvl ' + data.level;
    document.getElementById('xpLevel').textContent = 'Lvl ' + data.level;
    document.getElementById('xpText').textContent = data.xp_progress + ' / ' + data.xp_needed + ' XP';
    document.getElementById('xpTotal').textContent = data.xp.toLocaleString() + ' XP total';

    const pct = data.xp_needed > 0 ? Math.min(100, (data.xp_progress / data.xp_needed) * 100) : 0;
    document.getElementById('xpBarFill').style.width = pct + '%';
}

document.getElementById('pseudoSubmit').addEventListener('click', async () => {
    const pseudo = document.getElementById('pseudoInput').value.trim();
    if (!pseudo) return;
    try {
        const res = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pseudo }),
        });
        const data = await res.json();
        document.getElementById('pseudoModal').classList.remove('active');
        updateProfileUI(data);
    } catch (e) {
        console.error('Failed to create profile:', e);
    }
});

document.getElementById('pseudoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('pseudoSubmit').click();
});

// ─── Data loading ────────────────────────────────────────
async function loadProfile() {
    try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.exists) updateProfileUI(data);
    } catch (e) {}
}

async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('totalAps').textContent = data.total_aps.toLocaleString();

        const labels = Object.keys(ENC_COLORS);
        const values = labels.map(l => data.by_encryption[l] || 0);
        const colors = labels.map(l => ENC_COLORS[l]);

        const ctx = document.getElementById('encChart').getContext('2d');
        if (encChart) encChart.destroy();
        encChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#6b7280',
                            padding: 10,
                            font: { family: 'JetBrains Mono', size: 11 },
                            usePointStyle: true,
                            pointStyleWidth: 8,
                        },
                    },
                },
            },
        });

        const list = document.getElementById('topSsidList');
        if (data.top_ssids.length === 0) {
            list.innerHTML = '<li><span class="ssid-name">No data</span></li>';
        } else {
            list.innerHTML = data.top_ssids
                .map(s => `<li><span class="ssid-name">${escapeHtml(s.ssid)}</span><span class="ssid-count">${s.count}</span></li>`)
                .join('');
        }

        document.getElementById('totalSessions').textContent = data.total_sessions;
        document.getElementById('lastSession').textContent = data.last_session
            ? new Date(data.last_session).toLocaleString()
            : '--';

        loadSessions();
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

async function loadSessions() {
    try {
        const res = await fetch('/api/sessions');
        const sessions = await res.json();
        const bar = document.getElementById('sessionBar');
        if (sessions.length === 0) { bar.innerHTML = ''; return; }
        const maxAp = Math.max(...sessions.map(s => s.ap_imported + s.ap_updated));
        const recent = sessions.slice(0, 20).reverse();
        bar.innerHTML = recent
            .map(s => {
                const h = maxAp > 0 ? Math.max(4, ((s.ap_imported + s.ap_updated) / maxAp) * 36) : 4;
                return `<div class="session-bar-item" style="height:${h}px" title="${s.filename}: ${s.ap_imported} imported, +${s.xp_earned} XP"></div>`;
            })
            .join('');
    } catch (e) {
        console.error('Failed to load sessions:', e);
    }
}

async function loadGeoJSON() {
    try {
        const checked = [...document.querySelectorAll('#encFilters input:checked')].map(c => c.value);
        const ssid = document.getElementById('ssidSearch').value.trim();

        const params = new URLSearchParams();
        if (checked.length < 6) params.set('encryption', checked.join(','));
        if (ssid) params.set('ssid', ssid);

        const res = await fetch('/api/accesspoints/geojson?' + params);
        const geojson = await res.json();

        markersLayer.clearLayers();
        currentFeatures = geojson.features || [];

        if (currentFeatures.length === 0) return;

        const bounds = L.latLngBounds();

        currentFeatures.forEach(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            const enc = feature.properties.encryption || 'Unknown';
            const latlng = L.latLng(lat, lng);
            bounds.extend(latlng);

            const marker = L.circleMarker(latlng, {
                radius: 6,
                fillColor: ENC_COLORS[enc] || ENC_COLORS.Unknown,
                color: 'rgba(0,0,0,0.15)',
                weight: 1,
                fillOpacity: 0.85,
            });

            marker.on('click', () => {
                const nearby = findOverlapping(feature);
                popupFeatures = nearby;
                popupIndex = nearby.indexOf(feature);
                if (popupIndex === -1) popupIndex = 0;

                const popup = L.popup({ maxWidth: 280, maxHeight: 300, className: 'custom-popup' })
                    .setLatLng(latlng)
                    .setContent(buildPopupContent(nearby, popupIndex))
                    .openOn(map);
                activePopup = popup;
            });

            markersLayer.addLayer(marker);
        });

        // Build heatmap
        const heatData = currentFeatures.map(f => {
            const [lng, lat] = f.geometry.coordinates;
            const rssi = f.properties.rssi || -100;
            const intensity = Math.max(0.05, Math.min(1, (rssi + 100) / 60));
            return [lat, lng, intensity];
        });
        if (heatLayer) map.removeLayer(heatLayer);
        heatLayer = L.heatLayer(heatData, {
            radius: 18,
            blur: 22,
            maxZoom: 17,
            gradient: { 0.2: '#3b82f6', 0.5: '#f0883e', 0.8: '#f85149', 1.0: '#ffffff' },
        });
        if (viewMode === 'heat') map.addLayer(heatLayer);

        map.fitBounds(bounds, { padding: [30, 30] });
    } catch (e) {
        console.error('Failed to load GeoJSON:', e);
    }
}

// ─── Filters ─────────────────────────────────────────────
let searchTimeout;
document.getElementById('ssidSearch').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadGeoJSON, 400);
});

document.querySelectorAll('#encFilters input').forEach(cb => {
    cb.addEventListener('change', loadGeoJSON);
});

// ─── Upload Modal ────────────────────────────────────────
const uploadModal = document.getElementById('uploadModal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const uploadResult = document.getElementById('uploadResult');

document.getElementById('uploadBtn').addEventListener('click', () => {
    uploadModal.classList.add('active');
    resetUploadUI();
});

document.getElementById('closeModal').addEventListener('click', () => {
    uploadModal.classList.remove('active');
});

uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) uploadModal.classList.remove('active');
});

document.getElementById('browseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) uploadFiles(fileInput.files);
});

function resetUploadUI() {
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
    progressFill.style.background = '';
    uploadResult.style.display = 'none';
    fileInput.value = '';
}

async function uploadFiles(fileList) {
    progressBar.style.display = 'block';
    uploadResult.style.display = 'none';
    progressFill.style.width = '30%';

    const form = new FormData();
    for (const file of fileList) {
        form.append('files', file);
    }

    try {
        progressFill.style.width = '60%';
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        progressFill.style.width = '100%';

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        document.getElementById('resImported').textContent = data.total_imported;
        document.getElementById('resUpdated').textContent = data.total_updated;
        document.getElementById('resSkipped').textContent = data.total_skipped;
        document.getElementById('resXp').textContent = '+' + data.total_xp_earned;
        uploadResult.style.display = 'block';

        loadStats();
        loadGeoJSON();
        loadProfile();
    } catch (e) {
        console.error('Upload error:', e);
        progressFill.style.background = '#dc3545';
    }
}

// ─── Export ──────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
    window.location.href = '/api/export';
});

// ─── Navigation Map / Bluetooth ──────────────────────────
const navMap = document.getElementById('navMap');
const navBt = document.getElementById('navBt');
const mapEl = document.getElementById('map');
const btPage = document.getElementById('btPage');
const sidebar = document.getElementById('sidebar');

navMap.addEventListener('click', () => {
    navMap.classList.add('active');
    navBt.classList.remove('active');
    mapEl.style.display = '';
    btPage.style.display = 'none';
    sidebar.style.display = '';
    map.invalidateSize();
});

navBt.addEventListener('click', () => {
    navBt.classList.add('active');
    navMap.classList.remove('active');
    mapEl.style.display = 'none';
    btPage.style.display = 'flex';
    sidebar.style.display = 'none';
    loadBluetooth();
});

// ─── Bluetooth ───────────────────────────────────────────
let btSearchTimeout;
document.getElementById('btSearch').addEventListener('input', () => {
    clearTimeout(btSearchTimeout);
    btSearchTimeout = setTimeout(loadBluetooth, 400);
});

async function loadBluetooth() {
    try {
        const search = document.getElementById('btSearch').value.trim();
        const params = new URLSearchParams();
        if (search) params.set('search', search);

        const res = await fetch('/api/bluetooth?' + params);
        const data = await res.json();

        document.getElementById('btTotal').textContent = data.total;

        const tbody = document.getElementById('btTableBody');
        if (data.devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="bt-empty">No Bluetooth devices found</td></tr>';
            return;
        }

        tbody.innerHTML = data.devices.map(d => {
            const typeCls = d.device_type === 'BLE' ? 'ble' : 'bt';
            const name = d.ssid
                ? `<span class="bt-name">${escapeHtml(d.ssid)}</span>`
                : `<span class="bt-name empty">unnamed</span>`;
            return `<tr>
                <td>${name}</td>
                <td><span class="bt-mac">${escapeHtml(d.bssid)}</span></td>
                <td><span class="bt-type-badge ${typeCls}">${d.device_type}</span></td>
                <td><span class="bt-signal">${d.rssi} dBm</span></td>
                <td><span class="bt-coords">${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}</span></td>
                <td><span class="bt-date">${d.first_seen}</span></td>
                <td><span class="bt-date">${d.last_seen}</span></td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load bluetooth:', e);
    }
}

// ─── Hamburger (mobile) ──────────────────────────────────
document.getElementById('hamburgerBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ─── Util ────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ─── Init ────────────────────────────────────────────────
checkProfile();
loadStats();
loadGeoJSON();
