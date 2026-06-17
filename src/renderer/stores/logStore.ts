import { create } from 'zustand'
import type { SqlLogEntry } from '../../../preload/types'
import { sqlLogApi } from '../services/api'

const MAX_LOGS = 500

type LogFilter = 'all' | 'user' | 'system' | 'metadata'

interface LogState {
  logs: SqlLogEntry[]
  panelVisible: boolean
  panelHeight: number
  filter: LogFilter
  /** Active date-range filter as [startTime, endTime] in ms, or null for none */
  dateRange: [number, number] | null
  loading: boolean
  addLog: (entry: SqlLogEntry) => void
  clearLogs: () => void
  togglePanel: () => void
  setPanelVisible: (visible: boolean) => void
  setPanelHeight: (h: number) => void
  setFilter: (f: LogFilter) => void
  setDateRange: (range: [number, number] | null) => void
  loadLogs: () => Promise<void>
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  panelVisible: false,
  panelHeight: 200,
  filter: 'all',
  dateRange: null,
  loading: false,
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
  setFilter: (f) => set({ filter: f }),
  setDateRange: (range) => {
    set({ dateRange: range })
    // Re-query the persistent store with the new date range
    void get().loadLogs()
  },
  loadLogs: async () => {
    set({ loading: true })
    try {
      const { dateRange } = get()
      const params: { startTime?: number; endTime?: number; limit: number } = { limit: MAX_LOGS }
      if (dateRange) {
        params.startTime = dateRange[0]
        params.endTime = dateRange[1]
      }
      const persisted = await sqlLogApi.list(params)
      // list returns newest-first; reverse for oldest-first (append order)
      set({ logs: persisted.reverse() })
    } catch {
      // If persistence load fails, keep whatever is in memory
    } finally {
      set({ loading: false })
    }
  }
}))
