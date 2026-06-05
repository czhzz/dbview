import { useState, useEffect, useCallback, useMemo } from 'react'
import { theme as antdTheme } from 'antd'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dbview-theme'

function getSavedTheme(): ThemeMode {
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
}

function getSystemIsDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemIsDark() ? 'dark' : 'light'
  return mode
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getSavedTheme)
  const [systemDark, setSystemDark] = useState(getSystemIsDark)

  // Listen for system theme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const effective = useMemo(
    () => resolveEffectiveTheme(mode === 'system' ? 'system' : mode),
    [mode, systemDark]
  )

  const isDark = effective === 'dark'

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }, [])

  // Apply CSS class to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effective)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark, effective])

  // Ant Design theme config
  const antdThemeConfig = useMemo(
    () => ({
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 6
      },
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm
    }),
    [isDark]
  )

  // CodeMirror theme key
  const cmTheme = isDark ? 'dark' : 'light'

  return { mode, effective, isDark, setMode, antdThemeConfig, cmTheme }
}
