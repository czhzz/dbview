import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import App from './App'
import './i18n'
import { useTranslation } from 'react-i18next'
import { useTheme, type ThemeMode } from './hooks/useTheme'
import { getCurrentLanguage, setLanguage } from './i18n'
import './assets/styles/global.css'

const ANTD_LOCALES: Record<string, typeof zhCN> = {
  zh: zhCN,
  en: enUS
}

const AppWithProviders: React.FC = () => {
  const { i18n } = useTranslation()
  const { antdThemeConfig, isDark } = useTheme()
  const antdLocale = ANTD_LOCALES[i18n.language] || zhCN

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={antdThemeConfig}
    >
      <div className={isDark ? 'dark-theme' : ''} style={{ height: '100%' }}>
        <App />
      </div>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
)
