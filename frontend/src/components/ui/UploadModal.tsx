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
    const dropped = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...dropped])
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) return
    try {
      const data = await upload(files)
      setResults(data)
      if (data.length > 0) {
        setTrackingId(data[0].transaction_id)
      }
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
    <Modal open={uploadModalOpen} onClose={handleClose} title="Upload Captures">
      {!results.length ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragover
                ? 'border-wifi bg-wifi/5'
                : 'border-border hover:border-secondary'
            }`}
          >
            <FileUp size={36} className="mx-auto mb-3 text-secondary" />
            <p className="text-sm text-secondary mb-2">
              Drag & drop your wardriving captures here
            </p>
            <p className="text-xs text-muted mb-3">
              WiGLE CSV, Kismet, KML, NetStumbler, and more
            </p>
            <span className="inline-block px-4 py-2 rounded-lg bg-wifi/15 text-wifi text-xs font-semibold border border-wifi/30">
              Browse Files
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="hidden"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 border border-border">
                  <span className="text-xs font-mono text-primary truncate">{f.name}</span>
                  <span className="text-[10px] text-secondary flex-shrink-0">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-xp/15 text-xp font-semibold border border-xp/30 hover:bg-xp/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </>
      ) : (
        <>
          {/* Processing status */}
          <div className="text-center py-4">
            {isProcessing && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="text-wifi animate-spin" />
                <div className="text-sm font-semibold text-primary">Processing your captures...</div>
                <div className="text-xs text-secondary capitalize">{sseStatus?.status ?? 'Queued'}</div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-void rounded-full overflow-hidden">
                  <div className="h-full bg-wifi/70 rounded-full transition-all duration-500 animate-xp-shimmer"
                    style={{
                      width: sseStatus?.status === 'parsing' ? '30%'
                        : sseStatus?.status === 'trilaterating' ? '60%'
                        : sseStatus?.status === 'indexing' ? '85%'
                        : '15%',
                      backgroundImage: 'linear-gradient(90deg, rgba(0,212,255,0.5), #00d4ff, rgba(0,212,255,0.5))',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </div>
              </div>
            )}

            {isDone && sseStatus && (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle size={36} className="text-xp" />
                <div className="text-sm font-semibold text-xp">Quest Complete!</div>

                <div className="w-full bg-surface rounded-xl p-4 border border-border">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <ResultRow label="New Networks" value={sseStatus.new_networks} color="text-xp" />
                    <ResultRow label="Updated" value={sseStatus.updated_networks} color="text-wifi" />
                    <ResultRow label="Skipped" value={sseStatus.skipped_networks} color="text-secondary" />
                    <ResultRow label="WiFi" value={sseStatus.wifi_count} color="text-wifi" />
                    <ResultRow label="Bluetooth" value={sseStatus.bt_count} color="text-bt" />
                    <ResultRow label="Cell Towers" value={sseStatus.cell_count} color="text-cell" />
                  </div>

                  {sseStatus.xp_earned > 0 && (
                    <div className="mt-3 pt-3 border-t border-border text-center">
                      <span className="font-mono font-bold text-lg text-xp animate-text-glow">
                        +{formatNumber(sseStatus.xp_earned)} XP
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center gap-3">
                <XCircle size={36} className="text-danger" />
                <div className="text-sm font-semibold text-danger">Processing Failed</div>
                <div className="text-xs text-secondary">{sseStatus?.status_message ?? 'Unknown error'}</div>
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className="mt-4 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-secondary border border-border hover:text-primary hover:border-secondary transition-colors"
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
    <div className="flex justify-between py-1">
      <span className="text-secondary">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{formatNumber(value)}</span>
    </div>
  )
}
