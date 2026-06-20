import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import hi from './hi.json'
import en from './en.json'

export function initI18n(defaultLang: 'hi' | 'en' = 'hi') {
  if (i18n.isInitialized) return

  i18n.use(initReactI18next).init({
    resources: {
      hi: { translation: hi },
      en: { translation: en },
    },
    lng: defaultLang,
    fallbackLng: 'hi',
    interpolation: { escapeValue: false },
    // No backend — translations are bundled (offline-safe)
  })
}

export function changeLanguage(lang: 'hi' | 'en') {
  return i18n.changeLanguage(lang)
}

export default i18n