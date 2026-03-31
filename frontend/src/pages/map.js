import { $, escapeHtml } from '../utils.js';
import { getState, setState, subscribe } from '../state.js';

const ENC_COLORS = {
    WPA3: '#0d9373', WPA2: '#3b82f6', WPA: '#e07832',
    WEP: '#dc3545', Open: '#9ca3af', Unknown: '#d1d5db',
};

let map, markersLayer, heatLayer, btMarkersLayer, cellMarkersLayer;
let currentFeatures = [];
let popupFeatures = [], popupIndex = 0, activePopup = null;
let encChart = null;
let isInitialLoad = true;
let loadAbortController = null;

const BT_COLOR = '#8b5cf6';
const CELL_COLOR = '#3b82f6';

export { map, ENC_COLORS };

export function initMap() {
    map = L.map('map', { zoomControl: true }).setView([0, 0], 2);
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

    markersLayer = L.markerClusterGroup({
        maxClusterRadius: 40, disableClusteringAtZoom: 17,
        spiderfyOnMaxZoom: false, showCoverageOnHover: false, chunkedLoading: true,
    });
    map.addLayer(markersLayer);

    btMarkersLayer = L.layerGroup();
    cellMarkersLayer = L.layerGroup();

    // View mode buttons
    $('btnViewMarkers').addEventListener('click', () => setViewMode('markers'));
    $('btnViewHeat').addEventListener('click', () => setViewMode('heat'));

    // Layer toggles
    $('btnLayerWifi').addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('active');
        if (e.currentTarget.classList.contains('active')) map.addLayer(markersLayer);
        else map.removeLayer(markersLayer);
    });
    $('btnLayerBt').addEventListener('click', (e) => {
        const show = !getState('showBtLayer');
        setState('showBtLayer', show);
        e.currentTarget.classList.toggle('active', show);
        if (show) { map.addLayer(btMarkersLayer); loadBtLayer(); }
        else map.removeLayer(btMarkersLayer);
    });
    $('btnLayerCell').addEventListener('click', (e) => {
        const show = !getState('showCellLayer');
        setState('showCellLayer', show);
        e.currentTarget.classList.toggle('active', show);
        if (show) { map.addLayer(cellMarkersLayer); loadCellLayer(); }
        else map.removeLayer(cellMarkersLayer);
    });

    // Mine only
    $('btnMineOnly').addEventListener('click', () => {
        const v = !getState('mineOnly');
        setState('mineOnly', v);
        $('btnMineOnly').classList.toggle('mine-active', v);
        loadGeoJSON(false);
    });

    // Viewport reload
    let moveTimeout;
    map.on('moveend', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            loadGeoJSON(false);
            if (getState('showBtLayer')) loadBtLayer();
            if (getState('showCellLayer')) loadCellLayer();
        }, 300);
    });

    // Filters
    let searchTimeout;
    $('ssidSearch').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadGeoJSON(false), 400);
    });
    document.querySelectorAll('#encFilters input').forEach(cb => {
        cb.addEventListener('change', () => loadGeoJSON(false));
    });

    // Map search
    let mapSearchTimeout;
    $('mapSearch').addEventListener('input', (e) => {
        clearTimeout(mapSearchTimeout);
        const val = e.target.value.trim();
        mapSearchTimeout = setTimeout(() => {
            $('ssidSearch').value = val;
            loadGeoJSON(false);
        }, 400);
    });

    // Popup nav (global)
    window.popupNav = function(dir) {
        if (!popupFeatures.length || !activePopup) return;
        popupIndex = (popupIndex + dir + popupFeatures.length) % popupFeatures.length;
        const wrapper = activePopup.getElement();
        if (!wrapper) return;
        wrapper.querySelectorAll('.popup-ap').forEach(el => {
            el.style.display = parseInt(el.dataset.popupIdx) === popupIndex ? 'block' : 'none';
        });
        const idx = wrapper.querySelector('#popupIdx');
        if (idx) idx.textContent = popupIndex + 1;
        const f = popupFeatures[popupIndex];
        const [lng, lat] = f.geometry.coordinates;
        activePopup.setLatLng(L.latLng(lat, lng));
        map.panTo(L.latLng(lat, lng), { animate: true, duration: 0.25 });
    };

    loadGeoJSON(true);
}

function setViewMode(mode) {
    setState('viewMode', mode);
    $('btnViewMarkers').classList.toggle('active', mode === 'markers');
    $('btnViewHeat').classList.toggle('active', mode === 'heat');
    if (mode === 'markers') {
        if (heatLayer) map.removeLayer(heatLayer);
        map.addLayer(markersLayer);
    } else {
        map.removeLayer(markersLayer);
        if (heatLayer) map.addLayer(heatLayer);
    }
}

function findOverlapping(target) {
    const [tLng, tLat] = target.geometry.coordinates;
    const threshold = 0.00008;
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
        html += `<div class="popup-nav"><button class="popup-nav-btn" onclick="popupNav(-1)">&larr;</button><span class="popup-nav-count"><span id="popupIdx">${activeIndex + 1}</span> / ${total}</span><button class="popup-nav-btn" onclick="popupNav(1)">&rarr;</button></div>`;
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

export async function loadGeoJSON(fitBounds = false) {
    try {
        if (loadAbortController) loadAbortController.abort();
        loadAbortController = new AbortController();

        const checked = [...document.querySelectorAll('#encFilters input:checked')].map(c => c.value);
        const ssid = $('ssidSearch').value.trim();
        const params = new URLSearchParams();
        if (checked.length < 6) params.set('encryption', checked.join(','));
        if (ssid) params.set('ssid', ssid);
        if (getState('mineOnly')) params.set('mine_only', 'true');

        const bounds = map.getBounds();
        if (!isInitialLoad && bounds) {
            params.set('lat_min', bounds.getSouth().toFixed(6));
            params.set('lat_max', bounds.getNorth().toFixed(6));
            params.set('lon_min', bounds.getWest().toFixed(6));
            params.set('lon_max', bounds.getEast().toFixed(6));
        }

        const res = await fetch('/api/v1/networks/wifi/geojson?' + params, { signal: loadAbortController.signal });
        const geojson = await res.json();
        markersLayer.clearLayers();
        currentFeatures = geojson.features || [];
        if (currentFeatures.length === 0) return;

        const layerBounds = L.latLngBounds();
        currentFeatures.forEach(feature => {
            const [lng, lat] = feature.geometry.coordinates;
            const enc = feature.properties.encryption || 'Unknown';
            const latlng = L.latLng(lat, lng);
            layerBounds.extend(latlng);
            const marker = L.circleMarker(latlng, {
                radius: 6, fillColor: ENC_COLORS[enc] || ENC_COLORS.Unknown,
                color: 'rgba(0,0,0,0.15)', weight: 1, fillOpacity: 0.85,
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

        const heatData = currentFeatures.map(f => {
            const [lng, lat] = f.geometry.coordinates;
            const rssi = f.properties.rssi || -100;
            return [lat, lng, Math.max(0.05, Math.min(1, (rssi + 100) / 60))];
        });
        if (heatLayer) map.removeLayer(heatLayer);
        heatLayer = L.heatLayer(heatData, {
            radius: 18, blur: 22, maxZoom: 17,
            gradient: { 0.2: '#3b82f6', 0.5: '#f0883e', 0.8: '#f85149', 1.0: '#ffffff' },
        });
        if (getState('viewMode') === 'heat') map.addLayer(heatLayer);

        if (fitBounds || isInitialLoad) {
            if (layerBounds.isValid()) map.fitBounds(layerBounds, { padding: [30, 30] });
            isInitialLoad = false;
        }
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('Failed to load GeoJSON:', e);
    }
}

async function loadBtLayer() {
    if (!getState('showBtLayer')) return;
    try {
        const bounds = map.getBounds();
        const params = new URLSearchParams({
            lat_min: bounds.getSouth().toFixed(6), lat_max: bounds.getNorth().toFixed(6),
            lon_min: bounds.getWest().toFixed(6), lon_max: bounds.getEast().toFixed(6),
        });
        const res = await fetch('/api/v1/networks/bt/geojson?' + params);
        const geojson = await res.json();
        btMarkersLayer.clearLayers();
        for (const f of (geojson.features || [])) {
            const [lng, lat] = f.geometry.coordinates;
            const p = f.properties;
            const marker = L.circleMarker([lat, lng], {
                radius: 5, fillColor: BT_COLOR, color: 'rgba(0,0,0,0.15)', weight: 1, fillOpacity: 0.8,
            });
            marker.bindPopup(`<b>${escapeHtml(p.name) || '<i>unnamed</i>'}</b><br>MAC: ${escapeHtml(p.mac)}<br>Type: ${p.device_type}<br>Signal: ${p.rssi} dBm`);
            btMarkersLayer.addLayer(marker);
        }
    } catch (e) { console.error('Failed to load BT layer:', e); }
}

async function loadCellLayer() {
    if (!getState('showCellLayer')) return;
    try {
        const bounds = map.getBounds();
        const params = new URLSearchParams({
            lat_min: bounds.getSouth().toFixed(6), lat_max: bounds.getNorth().toFixed(6),
            lon_min: bounds.getWest().toFixed(6), lon_max: bounds.getEast().toFixed(6),
        });
        const res = await fetch('/api/v1/networks/cell/geojson?' + params);
        const geojson = await res.json();
        cellMarkersLayer.clearLayers();
        for (const f of (geojson.features || [])) {
            const [lng, lat] = f.geometry.coordinates;
            const p = f.properties;
            const marker = L.circleMarker([lat, lng], {
                radius: 8, fillColor: CELL_COLOR, color: 'rgba(0,0,0,0.2)', weight: 2, fillOpacity: 0.7,
            });
            marker.bindPopup(`<b>${p.radio}</b> Tower<br>MCC: ${p.mcc} / MNC: ${p.mnc}<br>LAC: ${p.lac || '--'} / CID: ${p.cid}<br>Signal: ${p.rssi} dBm`);
            cellMarkersLayer.addLayer(marker);
        }
    } catch (e) { console.error('Failed to load cell layer:', e); }
}

export function onMapEnter() {
    if (map) map.invalidateSize();
}
