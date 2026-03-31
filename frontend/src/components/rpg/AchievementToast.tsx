import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={`
              relative min-w-[300px] max-w-[400px] rounded-xl p-4 border backdrop-blur-lg
              ${toast.type === 'achievement'
                ? 'bg-legendary/10 border-legendary/30'
                : toast.type === 'success'
                ? 'bg-xp/10 border-xp/30'
                : 'bg-danger/10 border-danger/30'
              }
            `}
          >
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-2 right-2 text-secondary hover:text-primary"
            >
              <X size={14} />
            </button>

            <div className="flex items-start gap-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${toast.type === 'achievement'
                  ? 'bg-legendary/20 text-legendary'
                  : toast.type === 'success'
                  ? 'bg-xp/20 text-xp'
                  : 'bg-danger/20 text-danger'
                }
              `}>
                <Trophy size={20} />
              </div>
              <div className="flex-1 min-w-0">
                {toast.type === 'achievement' && (
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-legendary mb-0.5">
                    Achievement Unlocked!
                  </div>
                )}
                <div className="font-semibold text-sm text-primary">{toast.title}</div>
                {toast.message && (
                  <div className="text-xs text-secondary mt-0.5">{toast.message}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
