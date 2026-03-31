import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-[90vw] sm:max-w-[360px]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={`parchment-scrap p-3 relative ${
              toast.type === 'achievement' ? 'border-gold-tarnish' :
              toast.type === 'success' ? 'border-ink' : 'border-wax-red'
            }`}
          >
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-sm text-ink hover:text-wax-red transition-colors"
              aria-label="Dismiss"
            >
              &times;
            </button>

            <div className="flex items-start gap-2.5 pr-5">
              <div className={`w-8 h-8 border border-ink flex items-center justify-center flex-shrink-0 bg-parchment ${
                toast.type === 'achievement' ? 'text-gold-tarnish' :
                toast.type === 'success' ? 'text-ink' : 'text-wax-red'
              }`}>
                <Trophy size={14} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                {toast.type === 'achievement' && (
                  <div className="text-[9px] font-display font-bold uppercase tracking-[0.1em] text-wax-red mb-0.5">Achievement Unlocked!</div>
                )}
                <div className="font-display font-semibold text-xs text-ink">{toast.title}</div>
                {toast.message && (
                  <div className="text-[10px] text-sepia mt-0.5 font-mono">{toast.message}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
