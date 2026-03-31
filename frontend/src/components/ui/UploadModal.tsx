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
          <button
            type="button"
            onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            aria-label="Choose capture files to upload"
            aria-describedby="upload-help"
            className={`border-[3px] border-dashed p-12 text-center cursor-pointer transition-colors ${
              dragover ? 'border-wax-red bg-[#ebe4d0]' : 'border-ink hover:border-wax-red/60'
            }`}
            style={{ boxShadow: dragover ? '4px 4px 0 0 #1a1a1a' : undefined }}
          >
            <FileUp size={32} strokeWidth={1.5} className="mx-auto mb-4 text-gray-800" />
            <p className="text-base text-gray-900 mb-3 font-display leading-relaxed">Drag &amp; drop captures here</p>
            <p id="upload-help" className="text-sm text-gray-700 mb-6 font-mono leading-relaxed">WiGLE CSV, Kismet, KML, NetStumbler, and more</p>
            <span className="inline-block px-6 py-3 border-2 border-ink bg-parchment text-gold-tarnish text-sm font-display font-bold leading-relaxed">
              Browse Files
            </span>
            <input id="upload-files-input" ref={inputRef} type="file" multiple accept={ACCEPTED} onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="hidden" />
          </button>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-parchment px-4 py-3 border border-ink/40 font-mono"
                >
                  <span className="text-sm text-gray-900 truncate leading-relaxed">{f.name}</span>
                  <span className="text-xs text-gray-700 flex-shrink-0 tabular-nums">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 min-h-[3.25rem] border-2 border-ink bg-parchment text-gray-900 text-base font-display font-bold hover:text-wax-red disabled:opacity-25 disabled:cursor-not-allowed transition-colors leading-relaxed"
            style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" strokeWidth={1.75} /> : <Upload size={20} strokeWidth={1.75} />}
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </>
      ) : (
        <>
          <div className="text-center py-6">
            {isProcessing && (
              <div className="flex flex-col items-center gap-5" role="status" aria-live="polite">
                <Loader2 size={32} className="text-wax-red animate-spin" strokeWidth={1.75} />
                <div className="text-base font-display font-semibold text-gray-900 leading-relaxed">Processing captures...</div>
                <div className="text-sm text-gray-800 capitalize font-mono">{sseStatus?.status ?? 'Queued'}</div>
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
              <div className="flex flex-col items-center gap-5">
                <CheckCircle size={32} className="text-gray-900" strokeWidth={1.5} />
                <div className="text-base font-display font-bold text-gold-tarnish leading-relaxed">Quest Complete!</div>
                <div className="w-full rulebook-frame p-5">
                  <div className="grid grid-cols-2 gap-3 text-sm font-mono leading-relaxed">
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
              <div className="flex flex-col items-center gap-4" role="alert">
                <XCircle size={32} className="text-wax-red" strokeWidth={1.5} />
                <div className="text-base font-display font-semibold text-wax-red leading-relaxed">Processing Failed</div>
                <div className="text-sm text-gray-800 font-mono leading-relaxed max-w-md">{sseStatus?.status_message ?? 'Unknown error'}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="mt-8 w-full px-6 py-3 min-h-[3rem] border-2 border-dashed border-ink text-base font-display font-semibold text-gray-800 hover:text-wax-red transition-colors leading-relaxed"
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
    <div className="flex justify-between py-1 gap-4">
      <span className="text-gray-800">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${color}`}>{formatNumber(value)}</span>
    </div>
  )
}
