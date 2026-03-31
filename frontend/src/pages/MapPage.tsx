import { useEffect, useRef, useCallback, useState } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { Sidebar } from '@/components/layout/Sidebar'
import { useMapStore } from '@/stores/mapStore'
import { useAuthStore } from '@/stores/authStore'
import { authFetch } from '@/api/client'
import { Flame, MapPin, Search } from 'lucide-react'

// Fix leaflet default icon
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl })

const ENC_COLORS: Record<string, string> = {
  WPA3: '#00ff88', WPA2: '#00d4ff', WPA: '#f59e0b', WEP: '#ef4444', Open: '#6b7280', Unknown: '#555570',
}

const BT_COLOR = '#6366f1'
const CELL_COLOR = '#f59e0b'

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
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
  const { isAuthenticated } = useAuthStore()

  // Ref to hold the latest fetch function — assigned after useCallback below
  const fetchWifiRef = useRef<((map: L.Map, cluster: L.MarkerClusterGroup) => Promise<void>) | null>(null)

  // Initialize map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [46.6, 2.3],
      zoom: 6,
      zoomControl: false,
    })

    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
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

    // Use ref so moveend always calls the latest version of fetchWifiData
    const loadData = () => fetchWifiRef.current?.(map, cluster)
    map.on('moveend', loadData)
    loadData()

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Reload on filter changes
  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return
    fetchWifiRef.current?.(mapRef.current, clusterRef.current)
  }, [mineOnly, encryptionFilters, viewMode])

  // BT layer toggle
  useEffect(() => {
    if (!mapRef.current) return
    if (showBtLayer) {
      btLayerRef.current?.addTo(mapRef.current)
      fetchBtData(mapRef.current)
    } else {
      btLayerRef.current?.remove()
    }
  }, [showBtLayer])

  // Cell layer toggle
  useEffect(() => {
    if (!mapRef.current) return
    if (showCellLayer) {
      cellLayerRef.current?.addTo(mapRef.current)
      fetchCellData(mapRef.current)
    } else {
      cellLayerRef.current?.remove()
    }
  }, [showCellLayer])

  const fetchWifiData = useCallback(async (map: L.Map, cluster: L.MarkerClusterGroup) => {
    const bounds = map.getBounds()
    const params = new URLSearchParams({
      lat_min: String(bounds.getSouth()),
      lat_max: String(bounds.getNorth()),
      lon_min: String(bounds.getWest()),
      lon_max: String(bounds.getEast()),
    })
    if (mineOnly) params.set('mine_only', 'true')

    try {
      const res = await authFetch(`/networks/wifi/geojson?${params}`)
      if (!res.ok) return
      const geojson = await res.json()

      cluster.clearLayers()
      if (heatRef.current) {
        mapRef.current?.removeLayer(heatRef.current)
        heatRef.current = null
      }

      const features = geojson.features?.filter((f: any) => {
        const enc = f.properties?.encryption ?? 'Unknown'
        return encryptionFilters[enc] !== false
      }) ?? []

      if (viewMode === 'heatmap') {
        const heatData = features.map((f: any) => [
          f.geometry.coordinates[1],
          f.geometry.coordinates[0],
          0.5,
        ])
        if (heatData.length > 0 && (L as any).heatLayer) {
          heatRef.current = (L as any).heatLayer(heatData, {
            radius: 18,
            blur: 25,
            maxZoom: 17,
            gradient: { 0.2: '#0a0a0f', 0.4: '#00d4ff44', 0.6: '#00d4ff', 0.8: '#00ff88', 1: '#fbbf24' },
          }).addTo(map)
        }
      } else {
        features.forEach((f: any) => {
          const [lon, lat] = f.geometry.coordinates
          const p = f.properties
          const enc = p.encryption ?? 'Unknown'
          const color = ENC_COLORS[enc] ?? ENC_COLORS.Unknown

          const marker = L.circleMarker([lat, lon], {
            radius: 5,
            color,
            fillColor: color,
            fillOpacity: 0.7,
            weight: 1,
          })

          marker.bindPopup(`
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8;">
              <div style="font-weight: 700; color: ${color}; margin-bottom: 4px;">${escapeHtml(p.ssid || '<hidden>')}</div>
              <span style="color: #8888a8;">BSSID</span> ${escapeHtml(String(p.bssid))}<br/>
              <span style="color: #8888a8;">Encryption</span> <span style="color: ${color}; font-weight: 600;">${escapeHtml(enc)}</span><br/>
              ${p.channel ? `<span style="color: #8888a8;">Channel</span> ${p.channel}<br/>` : ''}
              ${p.rssi ? `<span style="color: #8888a8;">Signal</span> ${p.rssi} dBm<br/>` : ''}
              <span style="color: #8888a8;">Coords</span> <a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener" style="color: #00d4ff; text-decoration: none;">${lat.toFixed(5)}, ${lon.toFixed(5)}</a>
            </div>
          `)

          cluster.addLayer(marker)
        })
      }
    } catch (err) {
      console.error('Failed to load WiFi data:', err)
    }
  }, [mineOnly, encryptionFilters, viewMode])

  // Keep ref in sync so map event handlers use latest closure
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
        L.circleMarker([lat, lon], {
          radius: 4, color: BT_COLOR, fillColor: BT_COLOR, fillOpacity: 0.7, weight: 1,
        }).bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">
            <div style="font-weight: 700; color: ${BT_COLOR};">${escapeHtml(f.properties.name || '<unknown>')}</div>
            <span style="color: #8888a8;">MAC</span> ${escapeHtml(String(f.properties.mac))}<br/>
            <span style="color: #8888a8;">Type</span> ${escapeHtml(String(f.properties.device_type))}
          </div>
        `).addTo(btLayerRef.current!)
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
        L.circleMarker([lat, lon], {
          radius: 6, color: CELL_COLOR, fillColor: CELL_COLOR, fillOpacity: 0.7, weight: 1,
        }).bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">
            <div style="font-weight: 700; color: ${CELL_COLOR};">${f.properties.radio}</div>
            <span style="color: #8888a8;">MCC/MNC</span> ${f.properties.mcc}/${f.properties.mnc}<br/>
            <span style="color: #8888a8;">LAC/CID</span> ${f.properties.lac}/${f.properties.cid}
          </div>
        `).addTo(cellLayerRef.current!)
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
        const { latitude, longitude } = results[0]
        mapRef.current.setView([latitude, longitude], 16)
      }
    } catch {}
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 relative">
        {/* Map container */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Map controls overlay */}
        <div className="absolute top-3 right-3 z-[1000] flex gap-1 bg-panel/90 backdrop-blur-sm border border-border rounded-xl p-1">
          <button
            onClick={() => setViewMode('markers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'markers' ? 'bg-wifi/15 text-wifi' : 'text-secondary hover:text-primary'
            }`}
          >
            <MapPin size={13} /> Markers
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'heatmap' ? 'bg-wifi/15 text-wifi' : 'text-secondary hover:text-primary'
            }`}
          >
            <Flame size={13} /> Heatmap
          </button>
        </div>

        {/* Search */}
        <div className="absolute bottom-4 right-4 z-[1000] w-80 max-w-[calc(100%-2rem)]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search SSID or BSSID..."
              className="w-full pl-9 pr-3 py-2.5 bg-panel/90 backdrop-blur-sm border border-border rounded-xl text-xs font-mono text-primary placeholder:text-muted focus:border-wifi focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
