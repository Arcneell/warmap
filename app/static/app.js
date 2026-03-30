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

const markers = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
});
map.addLayer(markers);

let encChart = null;

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

        markers.clearLayers();
        if (geojson.features.length === 0) return;

        const layer = L.geoJSON(geojson, {
            pointToLayer: (feature, latlng) => {
                const enc = feature.properties.encryption || 'Unknown';
                return L.circleMarker(latlng, {
                    radius: 7,
                    fillColor: ENC_COLORS[enc] || ENC_COLORS.Unknown,
                    color: 'rgba(0,0,0,0.12)',
                    weight: 1,
                    fillOpacity: 0.85,
                });
            },
            onEachFeature: (feature, layer) => {
                const p = feature.properties;
                const encColor = ENC_COLORS[p.encryption] || ENC_COLORS.Unknown;
                layer.bindPopup(`
                    <div>
                        <div><span class="popup-label">SSID:</span> ${escapeHtml(p.ssid) || '<i>hidden</i>'}</div>
                        <div><span class="popup-label">BSSID:</span> ${escapeHtml(p.bssid)}</div>
                        <div><span class="popup-label">Encryption:</span> <span class="popup-enc" style="background:${encColor}20;color:${encColor}">${p.encryption}</span></div>
                        <div><span class="popup-label">Channel:</span> ${p.channel}</div>
                        <div><span class="popup-label">Signal:</span> ${p.rssi} dBm</div>
                        <div><span class="popup-label">First seen:</span> ${p.first_seen}</div>
                        <div><span class="popup-label">Last seen:</span> ${p.last_seen}</div>
                    </div>
                `);
            },
        });

        markers.addLayer(layer);
        map.fitBounds(markers.getBounds(), { padding: [30, 30] });
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
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) uploadFile(fileInput.files[0]);
});

function resetUploadUI() {
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
    progressFill.style.background = '';
    uploadResult.style.display = 'none';
    fileInput.value = '';
}

async function uploadFile(file) {
    progressBar.style.display = 'block';
    uploadResult.style.display = 'none';
    progressFill.style.width = '30%';

    const form = new FormData();
    form.append('file', file);

    try {
        progressFill.style.width = '60%';
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        progressFill.style.width = '100%';

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        document.getElementById('resImported').textContent = data.imported;
        document.getElementById('resUpdated').textContent = data.updated;
        document.getElementById('resSkipped').textContent = data.skipped;
        document.getElementById('resXp').textContent = '+' + data.xp_earned;
        uploadResult.style.display = 'block';

        loadStats();
        loadGeoJSON();
        loadProfile();
    } catch (e) {
        console.error('Upload error:', e);
        progressFill.style.background = '#dc3545';
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
