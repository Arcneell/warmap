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
          className="fixed inset-0 bg-ink/45 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`ornate-card ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} max-h-[85vh] overflow-hidden flex flex-col -rotate-[0.4deg]`}
          >
            <div className="flex items-center justify-between px-5 py-3 ornate-header gap-3">
              <h2 className="font-display font-bold text-base text-wax-red tracking-wide">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[2.25rem] min-h-[2.25rem] flex items-center justify-center font-display text-2xl leading-none text-ink hover:text-wax-red transition-colors border-2 border-transparent hover:border-dashed hover:border-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 text-ink">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
