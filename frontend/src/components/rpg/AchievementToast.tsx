import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-3 right-3 z-[10000] flex flex-col gap-2 max-w-[90vw] sm:max-w-[360px]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className={`ornate-card p-3 relative border-2 -rotate-[0.5deg] ${
              toast.type === 'achievement' ? 'border-gold-tarnish' :
              toast.type === 'success' ? 'border-ink' : 'border-wax-red'
            }`}
          >
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="absolute top-2 right-2 min-w-7 min-h-7 flex items-center justify-center font-display text-xl leading-none text-ink hover:text-wax-red border-2 border-transparent hover:border-dashed hover:border-ink transition-colors"
              aria-label="Dismiss"
            >
              ×
            </button>

            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 border-2 border-ink flex items-center justify-center flex-shrink-0 bg-parchment ${
                  toast.type === 'achievement' ? 'text-gold-tarnish' :
                  toast.type === 'success' ? 'text-ink' : 'text-wax-red'
                }`}
                style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
              >
                <Trophy size={17} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0 pr-7">
                {toast.type === 'achievement' && (
                  <div className="text-[8px] font-display font-bold uppercase tracking-[0.15em] text-wax-red mb-0.5">
                    Achievement Unlocked!
                  </div>
                )}
                <div className="font-display font-semibold text-xs text-ink">{toast.title}</div>
                {toast.message && (
                  <div className="text-[10px] text-sepia mt-0.5 font-mono leading-snug">{toast.message}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
