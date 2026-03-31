import { useState, useRef, useCallback } from 'react'
import { Modal } from './Modal'
import { useUIStore } from '@/stores/uiStore'
import { useFileUpload, useUploadSSE } from '@/api/hooks'
import { Upload, FileUp, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { formatNumber } from '@/lib/format'

const ACCEPTED = '.csv,.xml,.netxml,.kml,.kmz,.ns1,.db,.plist,.txt,.wiscan,.zip,.tar,.gz'

export function UploadModal() {
  const { uploadModalOpen, setUploadModalOpen, addToast } = useUIStore()
  const { upload, uploading } = useFileUpload()
  const [files, setFiles] = useState<File[]>([])
  const [dragover, setDragover] = useState(false)
  const [results, setResults] = useState<Array<{ transaction_id: number; status: string }>>([])
  const [trackingId, setTrackingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const sseStatus = useUploadSSE(trackingId)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragover(false)
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return
    try {
      const data = await upload(files)
      setResults(data)
      if (data.length > 0) setTrackingId(data[0].transaction_id)
    } catch {
      addToast({ type: 'error', title: 'Upload failed', message: 'Something went wrong' })
    }
  }

  const handleClose = () => {
    setUploadModalOpen(false)
    setFiles([])
    setResults([])
    setTrackingId(null)
  }

  const isDone = sseStatus?.status === 'done'
  const isError = sseStatus?.status === 'error'
  const isProcessing = trackingId && !isDone && !isError

  return (
    <Modal open={uploadModalOpen} onClose={handleClose} title="Submit Captures">
      {!results.length ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-[3px] border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragover ? 'border-wax-red bg-[#ebe4d0]' : 'border-ink hover:border-wax-red/60'
            }`}
            style={{ boxShadow: dragover ? '4px 4px 0 0 #1a1a1a' : undefined }}
          >
            <FileUp size={28} strokeWidth={1.5} className="mx-auto mb-2 text-sepia" />
            <p className="text-xs text-sepia mb-1 font-display">Drag &amp; drop captures here</p>
            <p className="text-[9px] text-muted mb-2 font-mono">WiGLE CSV, Kismet, KML, NetStumbler, and more</p>
            <span className="inline-block px-3 py-1.5 border-2 border-ink bg-parchment text-gold-tarnish text-[10px] font-display font-bold">
              Browse Files
            </span>
            <input ref={inputRef} type="file" multiple accept={ACCEPTED} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="hidden" />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-parchment px-2.5 py-1.5 border border-ink/40 font-mono"
                >
                  <span className="text-[10px] text-ink truncate">{f.name}</span>
                  <span className="text-[9px] text-sepia flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-2 border-ink bg-parchment text-ink text-xs font-display font-bold hover:text-wax-red disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" strokeWidth={1.75} /> : <Upload size={14} strokeWidth={1.75} />}
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </>
      ) : (
        <>
          <div className="text-center py-3">
            {isProcessing && (
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 size={28} className="text-wax-red animate-spin" strokeWidth={1.75} />
                <div className="text-xs font-display font-semibold text-ink">Processing captures...</div>
                <div className="text-[10px] text-sepia capitalize font-mono">{sseStatus?.status ?? 'Queued'}</div>
                <div className="w-full h-2 border-2 border-ink bg-parchment overflow-hidden">
                  <div
                    className="h-full bg-ink transition-all duration-500 border-r border-wax-red/40"
                    style={{
                      width: sseStatus?.status === 'parsing' ? '30%' : sseStatus?.status === 'trilaterating' ? '60%' : sseStatus?.status === 'indexing' ? '85%' : '15%',
                    }}
                  />
                </div>
              </div>
            )}

            {isDone && sseStatus && (
              <div className="flex flex-col items-center gap-2.5">
                <CheckCircle size={28} className="text-ink" strokeWidth={1.5} />
                <div className="text-xs font-display font-bold text-gold-tarnish">Quest Complete!</div>
                <div className="w-full ornate-card p-3 border-2 border-ink -rotate-0">
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                    <ResultRow label="New Networks" value={sseStatus.new_networks} color="text-ink" />
                    <ResultRow label="Updated" value={sseStatus.updated_networks} color="text-wifi" />
                    <ResultRow label="Skipped" value={sseStatus.skipped_networks} color="text-muted" />
                    <ResultRow label="WiFi" value={sseStatus.wifi_count} color="text-wifi" />
                    <ResultRow label="Bluetooth" value={sseStatus.bt_count} color="text-bt" />
                    <ResultRow label="Cell Towers" value={sseStatus.cell_count} color="text-cell" />
                  </div>
                  {sseStatus.xp_earned > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t-2 border-dashed border-ink text-center">
                      <span className="font-mono font-bold text-base text-gold-tarnish animate-text-glow">
                        +{formatNumber(sseStatus.xp_earned)} XP
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center gap-2">
                <XCircle size={28} className="text-wax-red" strokeWidth={1.5} />
                <div className="text-xs font-display font-semibold text-wax-red">Processing Failed</div>
                <div className="text-[10px] text-sepia font-mono">{sseStatus?.status_message ?? 'Unknown error'}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="mt-3 w-full px-4 py-2 border-2 border-dashed border-ink text-xs font-display font-semibold text-sepia hover:text-wax-red transition-colors"
          >
            Close
          </button>
        </>
      )}
    </Modal>
  )
}

function ResultRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-sepia">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{formatNumber(value)}</span>
    </div>
  )
}
