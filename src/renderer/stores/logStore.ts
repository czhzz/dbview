import { create } from 'zustand'
import type { SqlLogEntry } from '../../../preload/types'

const MAX_LOGS = 500

type LogFilter = 'all' | 'user' | 'system' | 'metadata'

interface LogState {
  logs: SqlLogEntry[]
  panelVisible: boolean
  panelHeight: number
  filter: LogFilter
  addLog: (entry: SqlLogEntry) => void
  clearLogs: () => void
  togglePanel: () => void
  setPanelVisible: (visible: boolean) => void
  setPanelHeight: (h: number) => void
  setFilter: (f: LogFilter) => void
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  panelVisible: false,
  panelHeight: 200,
  filter: 'all',
  addLog: (entry) =>
    set((state) => {
      const logs = [...state.logs, entry]
      if (logs.length > MAX_LOGS) {
        return { logs: logs.slice(-MAX_LOGS) }
      }
      return { logs }
    }),
  clearLogs: () => set({ logs: [] }),
  togglePanel: () => set((state) => ({ panelVisible: !state.panelVisible })),
  setPanelVisible: (visible) => set({ panelVisible: visible }),
  setPanelHeight: (h) => set({ panelHeight: Math.max(100, Math.min(500, h)) }),
  setFilter: (f) => set({ filter: f })
}))
