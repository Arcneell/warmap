import { useState } from 'react'
import { useBtDevices, useCellTowers } from '@/api/hooks'
import { Bluetooth, Radio, ChevronLeft, ChevronRight } from 'lucide-react'
import { SearchField } from '@/components/ui/SearchField'
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
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-1 w-full shrink-0 space-y-4 px-4 pt-5 pb-4 sm:px-6 md:px-8">
        <header className="mx-auto w-full max-w-3xl space-y-6 text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wax-red tracking-wide leading-loose border-b border-black/30 pb-8 text-gray-900">
            The Armory
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-800 font-sans leading-relaxed">
            Ledger of captured gear and chalked towers — one ruled line per entry, guild-book style.
          </p>
        </header>

        <div className="flex w-full flex-col items-center gap-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
            <TabSeal active={tab === 'bluetooth'} onClick={() => setTab('bluetooth')} icon={<Bluetooth size={18} strokeWidth={1.75} />} label="Bluetooth" count={btData?.total} />
            <TabSeal active={tab === 'cell'} onClick={() => setTab('cell')} icon={<Radio size={18} strokeWidth={1.75} />} label="Cell" count={cellData?.total} />
          </div>

          {tab === 'bluetooth' && (
            <div className="mx-auto w-full max-w-xl">
              <SearchField
                value={btSearch}
                onChange={(v) => { setBtSearch(v); setBtPage(0) }}
                placeholder="Search by name or address…"
              />
            </div>
          )}

          {tab === 'cell' && (
            <div className="flex w-full max-w-4xl flex-wrap justify-center gap-3 sm:gap-4">
              {radios.map((r) => (
                <button
                  key={r || 'all'}
                  type="button"
                  onClick={() => { setCellRadio(r); setCellPage(0) }}
                  className={`btn-parchment px-3 py-1.5 text-xs font-mono ${cellRadio === r ? 'active' : ''}`}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 w-full min-w-0 flex-1 overflow-hidden px-4 pb-4 sm:px-6 md:px-8 sm:pb-6">
        <div className="rulebook-frame h-full min-h-[240px] flex flex-col bg-parchment overflow-hidden w-full">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-sepia">
              <div className="w-8 h-8 border-2 border-ink border-t-transparent animate-spin" />
              <p className="font-display text-base text-gray-800 tracking-wide leading-relaxed">Opening the folio…</p>
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
            <footer className="flex items-center justify-center gap-4 border-t-2 border-ink bg-[#ebe4d0]/80 px-4 py-3">
              <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-1.5 text-sepia hover:text-ink disabled:opacity-25 transition-colors" aria-label="Previous page">
                <ChevronLeft size={18} strokeWidth={1.75} />
              </button>
              <span className="text-xs font-mono tabular-nums text-sepia">Page {page + 1} of {totalPages}</span>
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}
                className="p-1.5 text-sepia hover:text-ink disabled:opacity-25 transition-colors" aria-label="Next page">
                <ChevronRight size={18} strokeWidth={1.75} />
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
      className={`btn-parchment gap-2 px-4 py-2 text-sm ${active ? 'active' : ''}`}
    >
      {icon}
      {label}
      {count != null && <span className="font-mono text-sm opacity-80 tabular-nums">({formatNumber(count)})</span>}
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
      <p className="text-gray-800 text-base sm:text-lg font-sans max-w-md leading-relaxed">{message}</p>
    </div>
  )
}

function BtLedgerRow({ row }: { row: BtDevice }) {
  return (
    <li className="ledger-line flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
      <div className="min-w-0 flex-1">
        <p className={`font-display text-sm font-semibold ${row.name ? 'text-ink' : 'text-muted italic'}`}>
          {row.name || '<unknown>'}
        </p>
        <p className="font-mono text-xs text-sepia break-all">{row.mac}</p>
      </div>
      <span className={`inline-flex items-center px-2.5 py-1 border border-ink text-[10px] font-mono font-bold ${
        row.device_type === 'BLE' ? 'bg-parchment text-ink' : 'bg-[#ebe4d0] text-bt'
      }`}>
        {row.device_type}
      </span>
      <span className="font-mono text-xs text-sepia tabular-nums w-16 text-right">
        {row.rssi != null ? `${row.rssi} dBm` : '—'}
      </span>
      <div className="text-right text-xs shrink-0">
        <p className="font-mono text-muted">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</p>
        <p className="text-sepia">{timeAgo(row.last_seen)}</p>
      </div>
    </li>
  )
}

function CellLedgerRow({ row }: { row: CellTower }) {
  return (
    <li className="ledger-line flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
      <span className="inline-flex items-center px-2.5 py-1 border border-ink text-[10px] font-mono font-bold bg-parchment text-cell">
        {row.radio}
      </span>
      <div className="min-w-0 flex-1 font-mono text-xs">
        <p className="text-ink">MCC {row.mcc} / MNC {row.mnc}</p>
        <p className="text-sepia">LAC {row.lac} / CID {row.cid}</p>
      </div>
      <span className="font-mono text-xs text-sepia tabular-nums w-16 text-right">
        {row.rssi != null ? `${row.rssi} dBm` : '—'}
      </span>
      <div className="text-right text-xs shrink-0">
        <p className="font-mono text-muted">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</p>
        <p className="text-sepia">{timeAgo(row.last_seen)}</p>
      </div>
    </li>
  )
}
