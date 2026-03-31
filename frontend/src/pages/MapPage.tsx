import { useEffect, useRef, useCallback, useState } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { Sidebar } from '@/components/layout/Sidebar'
import { useMapStore } from '@/stores/mapStore'
import { authFetch } from '@/api/client'
import { Flame, MapPin, Crosshair } from 'lucide-react'
import { SearchField } from '@/components/ui/SearchField'

const ENC_COLORS: Record<string, string> = {
  WPA3: '#1a4d2e', WPA2: '#1e4a6b', WPA: '#8b4513', WEP: '#9b2c2c', Open: '#5c5348', Unknown: '#5c5348',
}
const BT_COLOR = '#4a2f6b'
const CELL_COLOR = '#8b4513'

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function inkCrossDivIcon(inkColor: string): L.DivIcon {
  const safe = inkColor.replace(/[^#0-9a-fA-F]/g, '') || '#1a1a1a'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5v19" fill="none" stroke="${safe}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M3.5 11.8c2.8-1.8 5.4-2.1 8.5-1.9 3 .2 6.3.6 9 2.1" fill="none" stroke="${safe}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M4.2 14.5c2.4 1.4 5.1 1.9 7.8 1.7 2.8-.1 5.6-.9 8-2.2" fill="none" stroke="${safe}" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`
  return L.divIcon({
    className: 'map-marker-root',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;margin-top:-2px">${svg}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 22],
  })
}

export function MapPage() {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const heatRef = useRef<L.Layer | null>(null)
  const btLayerRef = useRef<L.LayerGroup | null>(null)
  const cellLayerRef = useRef<L.LayerGroup | null>(null)
  const [searchVal, setSearchVal] = useState('')
  const { viewMode, mineOnly, showBtLayer, showCellLayer, encryptionFilters, setViewMode } = useMapStore()
  const fetchWifiRef = useRef<((map: L.Map, cluster: L.MarkerClusterGroup) => Promise<void>) | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [46.6, 2.3],
      zoom: 6,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      className: 'leaflet-tile-parchment',
    }).addTo(map)

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 17,
    })
    map.addLayer(cluster)
    clusterRef.current = cluster
    btLayerRef.current = L.layerGroup()
    cellLayerRef.current = L.layerGroup()
    mapRef.current = map

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 13)
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: false }
      )
    }

    const loadData = () => fetchWifiRef.current?.(map, cluster)
    map.on('moveend', loadData)
    loadData()

    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return
    fetchWifiRef.current?.(mapRef.current, clusterRef.current)
  }, [mineOnly, encryptionFilters, viewMode])

  useEffect(() => {
    if (!mapRef.current) return
    if (showBtLayer) { btLayerRef.current?.addTo(mapRef.current); fetchBtData(mapRef.current) }
    else { btLayerRef.current?.remove() }
  }, [showBtLayer])

  useEffect(() => {
    if (!mapRef.current) return
    if (showCellLayer) { cellLayerRef.current?.addTo(mapRef.current); fetchCellData(mapRef.current) }
    else { cellLayerRef.current?.remove() }
  }, [showCellLayer])

  const fetchWifiData = useCallback(async (map: L.Map, cluster: L.MarkerClusterGroup) => {
    const bounds = map.getBounds()
    const params = new URLSearchParams({
      lat_min: String(bounds.getSouth()), lat_max: String(bounds.getNorth()),
      lon_min: String(bounds.getWest()), lon_max: String(bounds.getEast()),
    })
    if (mineOnly) params.set('mine_only', 'true')

    try {
      const res = await authFetch(`/networks/wifi/geojson?${params}`)
      if (!res.ok) return
      const geojson = await res.json()

      cluster.clearLayers()
      if (heatRef.current) { mapRef.current?.removeLayer(heatRef.current); heatRef.current = null }

      const features = geojson.features?.filter((f: any) => {
        const enc = f.properties?.encryption ?? 'Unknown'
        return encryptionFilters[enc] !== false
      }) ?? []

      if (viewMode === 'heatmap') {
        const heatData = features.map((f: any) => [f.geometry.coordinates[1], f.geometry.coordinates[0], 0.5])
        if (heatData.length > 0 && (L as any).heatLayer) {
          heatRef.current = (L as any).heatLayer(heatData, {
            radius: 22, blur: 26, maxZoom: 17,
            gradient: {
              0.15: 'rgba(244,235,216,0)',
              0.35: 'rgba(26,26,26,0.25)',
              0.55: 'rgba(155,44,44,0.45)',
              0.75: 'rgba(139,69,19,0.55)',
              1: 'rgba(184,134,11,0.65)',
            },
          }).addTo(map)
        }
      } else {
        features.forEach((f: any) => {
          const [lon, lat] = f.geometry.coordinates
          const p = f.properties
          const enc = p.encryption ?? 'Unknown'
          const color = ENC_COLORS[enc] ?? ENC_COLORS.Unknown

          const marker = L.marker([lat, lon], { icon: inkCrossDivIcon(color) })
          marker.bindPopup(`
            <div style="font-size:13px; line-height:1.75; color:#1a1a1a;">
              <div style="font-weight:700; color:${color}; font-size:14px; margin-bottom:4px; font-family:system-ui;">${escapeHtml(p.ssid || '<hidden>')}</div>
              <span style="color:#4a3b32;">BSSID</span> ${escapeHtml(String(p.bssid))}<br/>
              <span style="color:#4a3b32;">Enc</span> <span style="color:${color}; font-weight:600;">${escapeHtml(enc)}</span><br/>
              ${p.channel ? `<span style="color:#4a3b32;">Ch</span> ${p.channel}<br/>` : ''}
              ${p.rssi ? `<span style="color:#4a3b32;">Sig</span> ${p.rssi} dBm<br/>` : ''}
              <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener" style="color:#8b6914; text-decoration:underline;">${lat.toFixed(5)}, ${lon.toFixed(5)}</a>
            </div>
          `)
          cluster.addLayer(marker)
        })
      }
    } catch (err) { console.error('Failed to load WiFi data:', err) }
  }, [mineOnly, encryptionFilters, viewMode])

  fetchWifiRef.current = fetchWifiData

  const fetchBtData = async (map: L.Map) => {
    const bounds = map.getBounds()
    try {
      const res = await authFetch(`/networks/bt/geojson?lat_min=${bounds.getSouth()}&lat_max=${bounds.getNorth()}&lon_min=${bounds.getWest()}&lon_max=${bounds.getEast()}`)
      if (!res.ok) return
      const geojson = await res.json()
      btLayerRef.current?.clearLayers()
      geojson.features?.forEach((f: any) => {
        const [lon, lat] = f.geometry.coordinates
        L.marker([lat, lon], { icon: inkCrossDivIcon(BT_COLOR) })
          .bindPopup(`<div style="font-size:13px;color:#1a1a1a;"><b style="color:${BT_COLOR};">${escapeHtml(f.properties.name || '<unknown>')}</b><br/><span style="color:#4a3b32;">MAC</span> ${escapeHtml(String(f.properties.mac))}<br/><span style="color:#4a3b32;">Type</span> ${escapeHtml(String(f.properties.device_type))}</div>`)
          .addTo(btLayerRef.current!)
      })
    } catch {}
  }

  const fetchCellData = async (map: L.Map) => {
    const bounds = map.getBounds()
    try {
      const res = await authFetch(`/networks/cell/geojson?lat_min=${bounds.getSouth()}&lat_max=${bounds.getNorth()}&lon_min=${bounds.getWest()}&lon_max=${bounds.getEast()}`)
      if (!res.ok) return
      const geojson = await res.json()
      cellLayerRef.current?.clearLayers()
      geojson.features?.forEach((f: any) => {
        const [lon, lat] = f.geometry.coordinates
        L.marker([lat, lon], { icon: inkCrossDivIcon(CELL_COLOR) })
          .bindPopup(`<div style="font-size:13px;color:#1a1a1a;"><b style="color:${CELL_COLOR};">${f.properties.radio}</b><br/><span style="color:#4a3b32;">MCC/MNC</span> ${f.properties.mcc}/${f.properties.mnc}<br/><span style="color:#4a3b32;">LAC/CID</span> ${f.properties.lac}/${f.properties.cid}</div>`)
          .addTo(cellLayerRef.current!)
      })
    } catch {}
  }

  const handleSearch = async () => {
    if (!searchVal.trim() || !mapRef.current) return
    try {
      const res = await authFetch(`/networks/wifi?ssid=${encodeURIComponent(searchVal)}&limit=1`)
      if (!res.ok) return
      const data = await res.json()
      const results = data.results ?? data
      if (results.length > 0) {
        mapRef.current.setView([results[0].latitude, results[0].longitude], 16)
      }
    } catch {}
  }

  const geolocate = () => {
    if (!mapRef.current || !('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => {},
      { timeout: 5000 }
    )
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar />

      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Top-right controls */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5">
          <div className="parchment-scrap flex items-center gap-0.5 p-1">
            <CtrlBtn active={viewMode === 'markers'} onClick={() => setViewMode('markers')} icon={<MapPin size={15} strokeWidth={1.75} />} label="Marks" />
            <CtrlBtn active={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')} icon={<Flame size={15} strokeWidth={1.75} />} label="Heat" />
          </div>
          <button
            type="button"
            onClick={geolocate}
            className="btn-parchment p-2"
            title="Center on my position"
            aria-label="Center map on my location"
          >
            <Crosshair size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Search bottom-right */}
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 z-[1000] sm:w-80">
          <SearchField
            value={searchVal}
            onChange={setSearchVal}
            placeholder="Search SSID or BSSID..."
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>
    </div>
  )
}

function CtrlBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-display font-bold transition-colors ${
        active ? 'bg-[#ebe4d0] text-wax-red' : 'text-sepia hover:text-ink'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
