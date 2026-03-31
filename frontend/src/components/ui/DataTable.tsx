import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  render: (row: T, index: number) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function DataTable<T>({ columns, data, loading, emptyMessage = 'No data found', page, totalPages, onPageChange }: DataTableProps<T>) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-parchment font-mono" aria-busy={loading ? 'true' : 'false'}>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`sticky top-0 bg-parchment px-4 py-3 text-left font-display text-[11px] uppercase tracking-[0.12em] text-wax-red border-b-2 border-ink ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-sepia">
                  <div className="flex items-center justify-center gap-2" role="status" aria-live="polite">
                    <div
                      className="w-5 h-5 border-2 border-ink border-t-transparent animate-spin"
                    />
                    <span className="text-[13px] font-display">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-muted text-[14px]" role="status" aria-live="polite">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-ink/20 hover:bg-[#ebe4d0]/80 transition-colors"
                  style={{
                    backgroundImage: 'linear-gradient(transparent calc(100% - 1px), rgba(26,26,26,0.08) 1px)',
                    backgroundSize: '100% 2rem',
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-[13px] text-ink align-top ${col.className ?? ''}`}>
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages != null && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-3 py-3 border-t-2 border-ink bg-[#ebe4d0]">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, (page ?? 0) - 1))}
            disabled={!page}
            className="p-1.5 border-2 border-transparent text-sepia hover:text-ink hover:border-dashed hover:border-ink disabled:opacity-25 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <span className="text-[12px] font-mono text-sepia">
            Page {(page ?? 0) + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange((page ?? 0) + 1)}
            disabled={(page ?? 0) >= totalPages - 1}
            className="p-1.5 border-2 border-transparent text-sepia hover:text-ink hover:border-dashed hover:border-ink disabled:opacity-25 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  )
}
