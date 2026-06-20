import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initI18n } from './i18n'
import { useAppStore } from './store/useAppStore'
import './index.css'

// Sync i18n language with persisted Zustand state on startup
const storedLang = (useAppStore.getState().language as 'hi' | 'en') || 'hi'
initI18n(storedLang)

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found in index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)