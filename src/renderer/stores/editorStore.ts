import { create } from 'zustand'

interface SqlTab {
  id: string
  title: string
  sql: string
  isDirty: boolean
}

interface EditorState {
  tabs: SqlTab[]
  activeTabId: string | null
  addTab: (tab: SqlTab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateSql: (id: string, sql: string) => void
  setDirty: (id: string, dirty: boolean) => void
}

let tabCounter = 0

export const useEditorStore = create<EditorState>((set) => ({
  tabs: [],
  activeTabId: null,
  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id
    })),
  closeTab: (id) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id)
      const newActiveId =
        state.activeTabId === id
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId
      return { tabs: newTabs, activeTabId: newActiveId }
    }),
  setActiveTab: (id) => set({ activeTabId: id }),
  updateSql: (id, sql) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, sql, isDirty: true } : t))
    })),
  setDirty: (id, dirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, isDirty: dirty } : t))
    }))
}))

export function createNewTab(sql = ''): SqlTab {
  tabCounter++
  return {
    id: `tab-${Date.now()}-${tabCounter}`,
    title: `查询 ${tabCounter}`,
    sql,
    isDirty: false
  }
}