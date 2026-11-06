import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { UiLanguage } from '../api/types'
import { en } from './locales/en'
import { fa } from './locales/fa'

const STORAGE_KEY = 'insightink.uiLanguage'

function isUiLanguage(value: string | null): value is UiLanguage {
  return value === 'fa' || value === 'en'
}

function initialLanguage(): UiLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isUiLanguage(stored) ? stored : 'fa'
  } catch {
    return 'fa'
  }
}

export function applyDocumentLanguage(language: UiLanguage) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
}

export async function changeUiLanguage(language: UiLanguage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Language still changes for this tab if storage is unavailable.
  }

  applyDocumentLanguage(language)
  await i18n.changeLanguage(language)
}

const language = initialLanguage()
applyDocumentLanguage(language)

void i18n.use(initReactI18next).init({
  resources: { fa, en },
  lng: language,
  fallbackLng: 'fa',
  interpolation: { escapeValue: false },
})

export default i18n
