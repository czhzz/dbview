import { useEffect, useCallback } from 'react'
import { useShortcutStore } from '../stores/shortcutStore'
import { useUIStore } from '../stores/uiStore'

type HotkeyAction = () => void

const actionRegistry = new Map<string, HotkeyAction>()

export function registerHotkeyAction(id: string, action: HotkeyAction): void {
  actionRegistry.set(id, action)
}

export function unregisterHotkeyAction(id: string): void {
  actionRegistry.delete(id)
}

function normalizeKeys(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  // Ignore modifier-only presses
  const key = e.key
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
    return ''
  }

  // Map special keys
  const keyMap: Record<string, string> = {
    '`': '`',
    ',': ',',
    'Tab': 'Tab',
    'Enter': 'Enter',
    'Escape': 'Escape',
    'Delete': 'Delete',
    'Backspace': 'Backspace'
  }

  const mappedKey = keyMap[key] || (key.length === 1 ? key.toUpperCase() : key)
  parts.push(mappedKey)

  return parts.join('+')
}

export function useHotkeys(): void {
  const shortcuts = useShortcutStore((s) => s.shortcuts)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const normalized = normalizeKeys(e)

      if (!normalized) return

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((s) => s.keys === normalized)

      if (matchingShortcut) {
        // If in an input and the shortcut doesn't involve Ctrl, skip
        if (isInput && !(e.ctrlKey || e.metaKey)) return

        e.preventDefault()
        e.stopPropagation()

        const action = actionRegistry.get(matchingShortcut.id)
        if (action) {
          action()
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Register default actions
export function registerDefaultActions(): void {
  const uiStore = useUIStore.getState

  registerHotkeyAction('nav:nextTab', () => {
    const state = useUIStore.getState()
    const { tabs, activeTabKey } = state
    if (tabs.length === 0) return
    const idx = tabs.findIndex((t) => t.key === activeTabKey)
    const nextIdx = (idx + 1) % tabs.length
    state.setActiveTab(tabs[nextIdx].key)
  })

  registerHotkeyAction('nav:prevTab', () => {
    const state = useUIStore.getState()
    const { tabs, activeTabKey } = state
    if (tabs.length === 0) return
    const idx = tabs.findIndex((t) => t.key === activeTabKey)
    const prevIdx = (idx - 1 + tabs.length) % tabs.length
    state.setActiveTab(tabs[prevIdx].key)
  })

  registerHotkeyAction('nav:closeTab', () => {
    const state = useUIStore.getState()
    if (state.activeTabKey) {
      state.closeTab(state.activeTabKey)
    }
  })

  registerHotkeyAction('nav:newTab', () => {
    // The SqlEditor component should listen for this
    // This is a placeholder - actual implementation in SqlEditor
    document.dispatchEvent(new CustomEvent('hotkey:newQueryTab'))
  })

  registerHotkeyAction('general:toggleSidebar', () => {
    const state = useUIStore.getState()
    state.toggleSidebar()
  })
}
