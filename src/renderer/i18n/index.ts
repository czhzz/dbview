import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhTranslation from '../locales/zh/translation.json'
import enTranslation from '../locales/en/translation.json'

const STORAGE_KEY = 'dbview-language'

function getSavedLanguage(): string {
  return localStorage.getItem(STORAGE_KEY) || 'zh'
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zhTranslation },
    en: { translation: enTranslation }
  },
  lng: getSavedLanguage(),
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false
  }
})

export function setLanguage(lang: string): void {
  i18n.changeLanguage(lang)
  localStorage.setItem(STORAGE_KEY, lang)
}

export function getCurrentLanguage(): string {
  return i18n.language
}

export default i18n
