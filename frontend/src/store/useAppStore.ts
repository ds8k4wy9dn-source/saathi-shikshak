import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppPage, LanguageKey, QueryResponse, SessionRecord, SubjectKey, TeacherProfile } from '../api/types'

interface AppState {
  // Navigation
  currentPage: AppPage

  // Auth
  isAuthenticated: boolean
  teacher: TeacherProfile | null

  // Language preference
  language: LanguageKey

  // Query context (persisted so last selection is remembered)
  selectedGrade: string
  selectedSubject: SubjectKey

  // Transient query/response state
  pendingQuery: string
  currentResponse: QueryResponse | null

  // Session history (cached locally)
  sessionHistory: SessionRecord[]

  // Toast/notification
  toast: { message: string; type: 'success' | 'error' | 'info' } | null

  // Actions
  navigate: (page: AppPage) => void
  setLanguage: (lang: LanguageKey) => void
  setAuthenticated: (teacher: TeacherProfile) => void
  logout: () => void
  setGrade: (grade: string) => void
  setSubject: (subject: SubjectKey) => void
  setPendingQuery: (query: string) => void
  setCurrentResponse: (response: QueryResponse | null) => void
  setSessionHistory: (sessions: SessionRecord[]) => void
  addToSessionHistory: (session: SessionRecord) => void
  updateSessionFeedback: (sessionId: string, feedback: 0 | 1) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────────────────────────────────────
      currentPage: 'language-select',
      isAuthenticated: false,
      teacher: null,
      language: 'hi',
      selectedGrade: '5',
      selectedSubject: 'hindi',
      pendingQuery: '',
      currentResponse: null,
      sessionHistory: [],
      toast: null,

      // ── Navigation ──────────────────────────────────────────────────────────
      navigate: (page) => set({ currentPage: page }),

      // ── Language ────────────────────────────────────────────────────────────
      setLanguage: (lang) => set({ language: lang }),

      // ── Auth ─────────────────────────────────────────────────────────────────
      setAuthenticated: (teacher) =>
        set({
          isAuthenticated: true,
          teacher,
          language: teacher.language_pref as LanguageKey,
          currentPage: teacher.is_new_user ? 'onboarding' : 'home',
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          teacher: null,
          currentPage: 'language-select',
          currentResponse: null,
          pendingQuery: '',
          sessionHistory: [],
        }),

      // ── Query context ────────────────────────────────────────────────────────
      setGrade: (grade) => set({ selectedGrade: grade }),
      setSubject: (subject) => set({ selectedSubject: subject }),
      setPendingQuery: (query) => set({ pendingQuery: query }),

      // ── Response ─────────────────────────────────────────────────────────────
      setCurrentResponse: (response) =>
        set({
          currentResponse: response,
          currentPage: response ? 'response' : 'home',
        }),

      // ── Session history ──────────────────────────────────────────────────────
      setSessionHistory: (sessions) => set({ sessionHistory: sessions }),

      addToSessionHistory: (session) =>
        set((state) => ({
          sessionHistory: [session, ...state.sessionHistory].slice(0, 20),
        })),

      updateSessionFeedback: (sessionId, feedback) =>
        set((state) => ({
          sessionHistory: state.sessionHistory.map((s) =>
            s.session_id === sessionId ? { ...s, feedback } : s
          ),
        })),

      // ── Toast ────────────────────────────────────────────────────────────────
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } })
        setTimeout(() => get().clearToast(), 3500)
      },
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'saathi-store-v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences and history, NOT transient state
      partialize: (state) => ({
        language: state.language,
        isAuthenticated: state.isAuthenticated,
        teacher: state.teacher,
        selectedGrade: state.selectedGrade,
        selectedSubject: state.selectedSubject,
        sessionHistory: state.sessionHistory,
      }),
    }
  )
)