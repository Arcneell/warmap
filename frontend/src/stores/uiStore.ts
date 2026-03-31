import { create } from 'zustand'

interface Toast {
  id: string
  type: 'success' | 'error' | 'achievement'
  title: string
  message?: string
  icon?: string
}

interface UIState {
  sidebarOpen: boolean
  uploadModalOpen: boolean
  loginModalOpen: boolean
  toasts: Toast[]
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setUploadModalOpen: (open: boolean) => void
  setLoginModalOpen: (open: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

let toastId = 0

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  uploadModalOpen: false,
  loginModalOpen: false,
  toasts: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  addToast: (toast) => {
    const id = `toast-${++toastId}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
