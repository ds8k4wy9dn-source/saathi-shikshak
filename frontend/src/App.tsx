import { useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { changeLanguage } from './i18n'
import { useAppStore } from './store/useAppStore'
import LanguageSelect from './pages/LanguageSelect'
import OtpInput from './pages/OtpInput'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Response from './pages/Response'
import SessionHistory from './pages/SessionHistory'
import type { AppPage } from './api/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
    mutations: { retry: 0 },
  },
})

// ─── Page transition wrapper ─────────────────────────────────────────────────
function PageView({ page }: { page: AppPage }) {
  switch (page) {
    case 'language-select': return <LanguageSelect />
    case 'otp-input':       return <OtpInput />
    case 'onboarding':      return <Onboarding />
    case 'home':            return <Home />
    case 'response':        return <Response />
    case 'session-history': return <SessionHistory />
    default:                return <LanguageSelect />
  }
}

function AnimatedRouter() {
  const currentPage = useAppStore(s => s.currentPage)
  const language = useAppStore(s => s.language)
  const toast = useAppStore(s => s.toast)
  const clearToast = useAppStore(s => s.clearToast)

  // Transition state: render previous page during fade-out, then switch
  const [displayPage, setDisplayPage] = useState<AppPage>(currentPage)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const prevPage = useRef(currentPage)

  // Sync i18n with Zustand language
  useEffect(() => { changeLanguage(language) }, [language])

  useEffect(() => {
  // Sync offline scenarios 2s after mount — non-blocking, best-effort
    const timer = setTimeout(() => {
    import('./offline/sync').then(m => m.syncOfflineScenarios())
    }, 2000)
  return () => clearTimeout(timer)
  }, [])

  // Animate page transitions
  useEffect(() => {
    if (currentPage === prevPage.current) return
    setPhase('out')
    const t = setTimeout(() => {
      setDisplayPage(currentPage)
      prevPage.current = currentPage
      setPhase('in')
    }, 220)
    return () => clearTimeout(t)
  }, [currentPage])

  const pageStyle: React.CSSProperties = {
    animation: phase === 'out'
      ? 'fade-out 0.22s ease-out forwards'
      : 'fade-slide-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <>
      <div style={pageStyle}>
        <PageView page={displayPage} />
      </div>

      {/* Global toast notification */}
      {toast && (
        <div
          className={`toast toast-${toast.type}`}
          onClick={clearToast}
          role="alert"
          aria-live="assertive"
        >
          {toast.message}
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="page-container">
        <AnimatedRouter />
      </div>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}