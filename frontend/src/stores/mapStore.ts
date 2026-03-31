import { create } from 'zustand'

type ViewMode = 'markers' | 'heatmap'

interface MapState {
  viewMode: ViewMode
  mineOnly: boolean
  showBtLayer: boolean
  showCellLayer: boolean
  encryptionFilters: Record<string, boolean>
  setViewMode: (mode: ViewMode) => void
  toggleMineOnly: () => void
  toggleBtLayer: () => void
  toggleCellLayer: () => void
  setEncryptionFilter: (enc: string, on: boolean) => void
}

export const useMapStore = create<MapState>((set) => ({
  viewMode: 'markers',
  mineOnly: false,
  showBtLayer: false,
  showCellLayer: false,
  encryptionFilters: {
    WPA3: true,
    WPA2: true,
    WPA: true,
    WEP: true,
    Open: true,
    Unknown: true,
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleMineOnly: () => set((s) => ({ mineOnly: !s.mineOnly })),
  toggleBtLayer: () => set((s) => ({ showBtLayer: !s.showBtLayer })),
  toggleCellLayer: () => set((s) => ({ showCellLayer: !s.showCellLayer })),
  setEncryptionFilter: (enc, on) =>
    set((s) => ({ encryptionFilters: { ...s.encryptionFilters, [enc]: on } })),
}))
