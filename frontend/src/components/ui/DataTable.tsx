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

export function DataTable<T>({
  columns, data, loading, emptyMessage = 'No data found',
  page, totalPages, onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`sticky top-0 bg-surface px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-secondary border-b border-border ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-wifi/30 border-t-wifi rounded-full animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center text-secondary text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm ${col.className ?? ''}`}>
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages != null && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 py-3 border-t border-border bg-panel">
          <button
            onClick={() => onPageChange(Math.max(0, (page ?? 0) - 1))}
            disabled={!page}
            className="p-1.5 rounded-lg text-secondary hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-mono text-secondary">
            Page {(page ?? 0) + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange((page ?? 0) + 1)}
            disabled={(page ?? 0) >= totalPages - 1}
            className="p-1.5 rounded-lg text-secondary hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
