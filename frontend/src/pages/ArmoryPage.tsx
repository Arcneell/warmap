import { useState } from 'react'
import { useBtDevices, useCellTowers } from '@/api/hooks'
import { DataTable } from '@/components/ui/DataTable'
import { Bluetooth, Radio, Search } from 'lucide-react'
import { formatNumber, timeAgo } from '@/lib/format'
import type { BtDevice, CellTower } from '@/api/types'

type Tab = 'bluetooth' | 'cell'

export function ArmoryPage() {
  const [tab, setTab] = useState<Tab>('bluetooth')
  const [btPage, setBtPage] = useState(0)
  const [cellPage, setCellPage] = useState(0)
  const [btSearch, setBtSearch] = useState('')
  const [cellRadio, setCellRadio] = useState('')

  const { data: btData, loading: btLoading } = useBtDevices(btPage * 50, 50, btSearch)
  const { data: cellData, loading: cellLoading } = useCellTowers(cellPage * 50, 50, cellRadio)

  const btColumns = [
    { key: 'name', label: 'Device', render: (r: BtDevice) => (
      <div>
        <div className={`font-semibold ${r.name ? 'text-primary' : 'text-muted italic'}`}>
          {r.name || '<unknown>'}
        </div>
        <div className="font-mono text-[10px] text-secondary">{r.mac}</div>
      </div>
    )},
    { key: 'type', label: 'Type', render: (r: BtDevice) => (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
        r.device_type === 'BLE' ? 'bg-xp/10 text-xp' : 'bg-bt/10 text-bt'
      }`}>
        {r.device_type}
      </span>
    )},
    { key: 'rssi', label: 'Signal', render: (r: BtDevice) => (
      <span className="font-mono text-xs">{r.rssi ? `${r.rssi} dBm` : '—'}</span>
    )},
    { key: 'coords', label: 'Location', render: (r: BtDevice) => (
      <span className="font-mono text-[10px] text-secondary">
        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
      </span>
    )},
    { key: 'seen', label: 'Last Seen', render: (r: BtDevice) => (
      <span className="text-xs text-secondary">{timeAgo(r.last_seen)}</span>
    )},
  ]

  const cellColumns = [
    { key: 'radio', label: 'Radio', render: (r: CellTower) => (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cell/10 text-cell">
        {r.radio}
      </span>
    )},
    { key: 'identity', label: 'Identity', render: (r: CellTower) => (
      <div>
        <div className="font-mono text-xs text-primary">MCC {r.mcc} / MNC {r.mnc}</div>
        <div className="font-mono text-[10px] text-secondary">LAC {r.lac} / CID {r.cid}</div>
      </div>
    )},
    { key: 'rssi', label: 'Signal', render: (r: CellTower) => (
      <span className="font-mono text-xs">{r.rssi ? `${r.rssi} dBm` : '—'}</span>
    )},
    { key: 'coords', label: 'Location', render: (r: CellTower) => (
      <span className="font-mono text-[10px] text-secondary">
        {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
      </span>
    )},
    { key: 'seen', label: 'Last Seen', render: (r: CellTower) => (
      <span className="text-xs text-secondary">{timeAgo(r.last_seen)}</span>
    )},
  ]

  const radios = ['', 'GSM', 'LTE', 'WCDMA', 'CDMA', 'NR']

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex-shrink-0">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-primary mb-1">The Armory</h1>
        <p className="text-sm text-secondary">Your collection of captured devices and towers</p>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Tab buttons */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
            <TabBtn active={tab === 'bluetooth'} onClick={() => setTab('bluetooth')} icon={<Bluetooth size={14} />} label="Bluetooth" count={btData?.total} />
            <TabBtn active={tab === 'cell'} onClick={() => setTab('cell')} icon={<Radio size={14} />} label="Cell Towers" count={cellData?.total} />
          </div>

          {/* Search / Filter */}
          {tab === 'bluetooth' && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={btSearch}
                onChange={(e) => { setBtSearch(e.target.value); setBtPage(0) }}
                placeholder="Search devices..."
                className="pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-primary placeholder:text-muted focus:border-wifi focus:outline-none transition-colors"
              />
            </div>
          )}

          {tab === 'cell' && (
            <div className="flex gap-1">
              {radios.map((r) => (
                <button
                  key={r}
                  onClick={() => { setCellRadio(r); setCellPage(0) }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    cellRadio === r ? 'bg-cell/15 text-cell border border-cell/30' : 'text-secondary hover:text-primary border border-transparent'
                  }`}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="h-full bg-panel rounded-2xl border border-border overflow-hidden flex flex-col">
          {tab === 'bluetooth' ? (
            <DataTable
              columns={btColumns}
              data={btData?.results ?? []}
              loading={btLoading}
              emptyMessage="No Bluetooth devices found yet. Upload some captures!"
              page={btPage}
              totalPages={Math.ceil((btData?.total ?? 0) / 50)}
              onPageChange={setBtPage}
            />
          ) : (
            <DataTable
              columns={cellColumns}
              data={cellData?.results ?? []}
              loading={cellLoading}
              emptyMessage="No cell towers found yet. Upload some captures!"
              page={cellPage}
              totalPages={Math.ceil((cellData?.total ?? 0) / 50)}
              onPageChange={setCellPage}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active ? 'bg-wifi/15 text-wifi' : 'text-secondary hover:text-primary'
      }`}
    >
      {icon} {label}
      {count != null && <span className="font-mono text-[10px] opacity-60">{formatNumber(count)}</span>}
    </button>
  )
}
