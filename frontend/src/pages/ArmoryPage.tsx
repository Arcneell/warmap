import { useState } from 'react'
import { useBtDevices, useCellTowers } from '@/api/hooks'
import { Bluetooth, Radio, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

  const radios = ['', 'GSM', 'LTE', 'WCDMA', 'CDMA', 'NR']

  const btRows = btData?.results ?? []
  const cellRows = cellData?.results ?? []
  const btTotalPages = Math.ceil((btData?.total ?? 0) / 50)
  const cellTotalPages = Math.ceil((cellData?.total ?? 0) / 50)
  const loading = tab === 'bluetooth' ? btLoading : cellLoading
  const page = tab === 'bluetooth' ? btPage : cellPage
  const totalPages = tab === 'bluetooth' ? btTotalPages : cellTotalPages
  const setPage = tab === 'bluetooth' ? setBtPage : setCellPage

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 px-8 sm:px-12 lg:px-16 pt-12 pb-10 space-y-10">
        <header className="text-center max-w-2xl mx-auto space-y-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wax-red tracking-wide leading-loose border-b border-black/30 pb-8">
            The Armory
          </h1>
          <p className="text-sm sm:text-base text-sepia font-sans leading-loose">
            Ledger of captured gear and chalked towers — one ruled line per entry, guild-book style.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 lg:items-end lg:justify-between max-w-5xl mx-auto w-full">
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            <TabSeal active={tab === 'bluetooth'} onClick={() => setTab('bluetooth')} icon={<Bluetooth size={18} strokeWidth={1.75} />} label="Bluetooth" count={btData?.total} />
            <TabSeal active={tab === 'cell'} onClick={() => setTab('cell')} icon={<Radio size={18} strokeWidth={1.75} />} label="Cell" count={cellData?.total} />
          </div>

          {tab === 'bluetooth' && (
            <div className="relative border-2 border-ink bg-[#fdf8ed] max-w-md mx-auto lg:mx-0 w-full">
              <Search size={18} strokeWidth={1.75} className="absolute left-5 top-1/2 -translate-y-1/2 text-sepia pointer-events-none" />
              <input
                value={btSearch}
                onChange={(e) => { setBtSearch(e.target.value); setBtPage(0) }}
                placeholder="Search by name or address…"
                className="w-full pl-14 pr-5 py-4 bg-transparent text-sm font-mono text-ink placeholder:text-muted focus:outline-none leading-loose"
              />
            </div>
          )}

          {tab === 'cell' && (
            <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
              {radios.map((r) => (
                <button
                  key={r || 'all'}
                  type="button"
                  onClick={() => { setCellRadio(r); setCellPage(0) }}
                  className={`px-5 py-3 border-2 text-xs font-mono font-bold transition-all leading-loose ${
                    cellRadio === r ? 'border-ink bg-[#ebe4d0] text-cell' : 'border-transparent text-muted hover:text-ink border-dashed hover:border-ink'
                  }`}
                  style={cellRadio === r ? { boxShadow: '2px 2px 0 0 #1a1a1a' } : undefined}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-8 sm:px-12 lg:px-16 pb-12 sm:pb-16">
        <div className="rulebook-frame h-full min-h-[240px] flex flex-col bg-parchment overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-sepia">
              <div className="w-8 h-8 border-2 border-ink border-t-transparent animate-spin" />
              <p className="font-display text-sm tracking-wide leading-loose">Opening the folio…</p>
            </div>
          ) : tab === 'bluetooth' ? (
            btRows.length === 0 ? (
              <EmptyLedger message="No Bluetooth devices yet. Upload some captures!" />
            ) : (
              <LedgerList>
                {btRows.map((r) => (
                  <BtLedgerRow key={`${r.mac}-${r.last_seen}`} row={r} />
                ))}
              </LedgerList>
            )
          ) : (
            cellRows.length === 0 ? (
              <EmptyLedger message="No cell towers found yet." />
            ) : (
              <LedgerList>
                {cellRows.map((r) => (
                  <CellLedgerRow key={`${r.mcc}-${r.mnc}-${r.lac}-${r.cid}`} row={r} />
                ))}
              </LedgerList>
            )
          )}

          {totalPages > 1 && !loading && (
            <footer className="shrink-0 flex items-center justify-center gap-6 py-6 px-8 border-t-2 border-ink bg-[#ebe4d0]/90">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 border-2 border-transparent text-sepia hover:text-ink hover:border-dashed hover:border-ink disabled:opacity-30 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={22} strokeWidth={1.75} />
              </button>
              <span className="text-sm font-mono text-sepia tabular-nums leading-loose">
                Folio {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-2 border-2 border-transparent text-sepia hover:text-ink hover:border-dashed hover:border-ink disabled:opacity-30 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={22} strokeWidth={1.75} />
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}

function TabSeal({ active, onClick, icon, label, count }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-4 border-2 text-sm font-display font-semibold transition-colors leading-loose ${
        active ? 'border-ink bg-[#ebe4d0] text-wax-red' : 'border-dashed border-transparent text-sepia hover:text-ink hover:border-ink bg-parchment/60'
      }`}
      style={active ? { boxShadow: '3px 3px 0 0 #1a1a1a' } : undefined}
    >
      {icon}
      {label}
      {count != null && <span className="font-mono text-xs opacity-70 tabular-nums">({formatNumber(count)})</span>}
    </button>
  )
}

function LedgerList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto scroll-pb-4">
      <ul className="list-none divide-y divide-black/15">
        {children}
      </ul>
    </div>
  )
}

function EmptyLedger({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-16 text-center">
      <p className="text-sepia text-sm sm:text-base font-sans max-w-md leading-loose">{message}</p>
    </div>
  )
}

function BtLedgerRow({ row }: { row: BtDevice }) {
  return (
    <li className="ledger-line px-8 sm:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:items-center">
      <div className="lg:col-span-5 space-y-3 min-w-0">
        <p className={`font-display font-semibold text-base leading-relaxed ${row.name ? 'text-ink' : 'text-muted italic'}`}>
          {row.name || '<unknown>'}
        </p>
        <p className="font-mono text-xs sm:text-sm text-sepia break-all leading-loose">{row.mac}</p>
      </div>
      <div className="lg:col-span-2 flex lg:justify-center">
        <span
          className={`inline-flex items-center px-4 py-2 border-2 border-ink text-xs font-mono font-bold leading-loose ${
            row.device_type === 'BLE' ? 'bg-parchment text-ink' : 'bg-[#ebe4d0] text-bt'
          }`}
        >
          {row.device_type}
        </span>
      </div>
      <div className="lg:col-span-2 font-mono text-sm text-sepia tabular-nums leading-loose">
        {row.rssi != null ? `${row.rssi} dBm` : '—'}
      </div>
      <div className="lg:col-span-3 space-y-2 text-sm leading-loose">
        <p className="font-mono text-xs text-muted break-words">
          {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
        </p>
        <p className="text-sepia">{timeAgo(row.last_seen)}</p>
      </div>
    </li>
  )
}

function CellLedgerRow({ row }: { row: CellTower }) {
  return (
    <li className="ledger-line px-8 sm:px-12 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:items-center">
      <div className="lg:col-span-2 flex lg:justify-start">
        <span className="inline-flex items-center px-4 py-2 border-2 border-ink text-xs font-mono font-bold bg-parchment text-cell leading-loose">
          {row.radio}
        </span>
      </div>
      <div className="lg:col-span-5 space-y-2 font-mono text-sm leading-loose min-w-0">
        <p className="text-ink">MCC {row.mcc} / MNC {row.mnc}</p>
        <p className="text-sepia">LAC {row.lac} / CID {row.cid}</p>
      </div>
      <div className="lg:col-span-2 font-mono text-sm text-sepia tabular-nums">
        {row.rssi != null ? `${row.rssi} dBm` : '—'}
      </div>
      <div className="lg:col-span-3 space-y-2 text-sm leading-loose">
        <p className="font-mono text-xs text-muted break-words">
          {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
        </p>
        <p className="text-sepia">{timeAgo(row.last_seen)}</p>
      </div>
    </li>
  )
}
