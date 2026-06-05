import { create } from 'zustand'

interface TabItem {
  key: string
  title: string
  type: 'data' | 'structure' | 'query'
  connId: string
  table?: string
  schema?: string
}

interface UIState {
  sidebarWidth: number
  tabs: TabItem[]
  activeTabKey: string | null
  statusText: string
  setSidebarWidth: (width: number) => void
  openTab: (tab: TabItem) => void
  closeTab: (key: string) => void
  setActiveTab: (key: string) => void
  setStatusText: (text: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 280,
  tabs: [],
  activeTabKey: null,
  statusText: '',
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),
  openTab: (tab) =>
    set((state) => {
      const existing = state.tabs.find((t) => t.key === tab.key)
      if (existing) {
        return { activeTabKey: tab.key }
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabKey: tab.key
      }
    }),
  closeTab: (key) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.key !== key)
      const newActiveKey =
        state.activeTabKey === key
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].key
            : null
          : state.activeTabKey
      return { tabs: newTabs, activeTabKey: newActiveKey }
    }),
  setActiveTab: (key) => set({ activeTabKey: key }),
  setStatusText: (text) => set({ statusText: text })
}))