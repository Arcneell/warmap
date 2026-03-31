import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink/45 z-[10000] flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`rulebook-frame bg-parchment ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} max-h-[85vh] overflow-hidden flex flex-col`}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b-2 border-ink gap-3 bg-[#ebe4d0]">
              <h2 className="font-display font-bold text-base sm:text-lg text-wax-red tracking-wide">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center font-display text-xl text-ink hover:text-wax-red transition-colors border border-transparent hover:border-ink"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="px-5 sm:px-6 py-5 sm:py-6 overflow-y-auto flex-1 text-ink text-sm">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
