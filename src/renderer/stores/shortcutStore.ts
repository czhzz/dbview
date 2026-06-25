import { create } from 'zustand'
import { shortcutApi } from '../services/api'
import type { ShortcutEntry } from '../types/database'

export interface ShortcutState {
  shortcuts: ShortcutEntry[]
  initialized: boolean
  init: () => Promise<void>
  setShortcut: (id: string, keys: string) => { conflict: boolean; conflictWith?: string }
  resetToDefault: () => void
  getKeys: (id: string) => string
  importFromJson: (json: string) => boolean
  exportAsJson: () => string
}

const DEFAULT_SHORTCUTS: ShortcutEntry[] = [
  // Editor
  { id: 'editor:execute', label: '执行 SQL', keys: 'Ctrl+Enter', category: 'editor', defaultKeys: 'Ctrl+Enter' },
  { id: 'editor:executeSelected', label: '执行选中 SQL', keys: 'Ctrl+Shift+Enter', category: 'editor', defaultKeys: 'Ctrl+Shift+Enter' },
  { id: 'editor:format', label: '格式化 SQL', keys: 'Ctrl+Shift+F', category: 'editor', defaultKeys: 'Ctrl+Shift+F' },
  { id: 'editor:explain', label: 'EXPLAIN', keys: 'Ctrl+Shift+E', category: 'editor', defaultKeys: 'Ctrl+Shift+E' },
  // Navigation
  { id: 'nav:nextTab', label: '下一个标签', keys: 'Ctrl+Tab', category: 'navigation', defaultKeys: 'Ctrl+Tab' },
  { id: 'nav:prevTab', label: '上一个标签', keys: 'Ctrl+Shift+Tab', category: 'navigation', defaultKeys: 'Ctrl+Shift+Tab' },
  { id: 'nav:closeTab', label: '关闭标签', keys: 'Ctrl+W', category: 'navigation', defaultKeys: 'Ctrl+W' },
  { id: 'nav:newTab', label: '新建查询', keys: 'Ctrl+T', category: 'navigation', defaultKeys: 'Ctrl+T' },
  // Data
  { id: 'data:export', label: '导出数据', keys: 'Ctrl+Shift+E', category: 'data', defaultKeys: 'Ctrl+Shift+E' },
  { id: 'data:saveEdits', label: '保存编辑', keys: 'Ctrl+S', category: 'data', defaultKeys: 'Ctrl+S' },
  // General
  { id: 'general:toggleSidebar', label: '切换侧边栏', keys: 'Ctrl+`', category: 'general', defaultKeys: 'Ctrl+`' },
  { id: 'general:settings', label: '设置', keys: 'Ctrl+,', category: 'general', defaultKeys: 'Ctrl+,' },
]

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  shortcuts: [...DEFAULT_SHORTCUTS],
  initialized: false,

  init: async () => {
    try {
      const saved = await shortcutApi.load()
      if (saved && saved.length > 0) {
        // Merge saved with defaults (keep saved keys, add new defaults)
        const savedMap = new Map(saved.map((s) => [s.id, s]))
        const merged = DEFAULT_SHORTCUTS.map((d) => savedMap.get(d.id) || d)
        // Add any saved shortcuts that don't exist in defaults
        for (const s of saved) {
          if (!merged.find((m) => m.id === s.id)) {
            merged.push(s)
          }
        }
        set({ shortcuts: merged, initialized: true })
      } else {
        set({ initialized: true })
      }
    } catch {
      set({ initialized: true })
    }
  },

  setShortcut: (id: string, keys: string) => {
    const { shortcuts } = get()
    // Conflict detection
    const conflict = shortcuts.find((s) => s.keys === keys && s.id !== id)
    if (conflict) {
      return { conflict: true, conflictWith: conflict.label }
    }

    set({
      shortcuts: shortcuts.map((s) => (s.id === id ? { ...s, keys } : s))
    })

    // Persist
    shortcutApi.save(get().shortcuts).catch(() => {})

    return { conflict: false }
  },

  resetToDefault: () => {
    set({ shortcuts: [...DEFAULT_SHORTCUTS] })
    shortcutApi.save(DEFAULT_SHORTCUTS).catch(() => {})
  },

  getKeys: (id: string) => {
    return get().shortcuts.find((s) => s.id === id)?.keys || ''
  },

  importFromJson: (json: string) => {
    try {
      const data = JSON.parse(json)
      if (!Array.isArray(data)) return false
      set({ shortcuts: data })
      shortcutApi.save(data).catch(() => {})
      return true
    } catch {
      return false
    }
  },

  exportAsJson: () => {
    return JSON.stringify(get().shortcuts, null, 2)
  }
}))
