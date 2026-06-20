import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import { useAppStore } from '../store/useAppStore'
import type { QueryRequest, FeedbackRequest } from './types'

// ── Query hook (main feature) ─────────────────────────────────────────────────
export function useGetAdvice() {
  const setCurrentResponse = useAppStore(s => s.setCurrentResponse)
  const addToSessionHistory = useAppStore(s => s.addToSessionHistory)
  const showToast = useAppStore(s => s.showToast)
  const language = useAppStore(s => s.language)

  return useMutation({
    mutationFn: (req: QueryRequest) => apiClient.query(req),
    onSuccess: (data) => {
      setCurrentResponse(data)
      // Add to local session history immediately (optimistic)
      addToSessionHistory({
        session_id: data.session_id,
        query_text: '',   // filled in by query endpoint on next fetch
        grade: null,
        subject: null,
        language: data.language,
        created_at: new Date().toISOString(),
        feedback: null,
        response_preview: data.immediate_steps.steps[0] || '',
      })
    },
    onError: (error: Error) => {
      if (error.message.startsWith('RATE_LIMIT:')) {
        showToast(error.message.replace('RATE_LIMIT:', ''), 'info')
      } else {
        const msg = language === 'hi' ? 'कुछ गड़बड़ हो गई। फिर से कोशिश करें।' : 'Something went wrong. Please try again.'
        showToast(msg, 'error')
      }
    },
  })
}

// ── Session history hook ──────────────────────────────────────────────────────
export function useSessionHistory(teacherId: string | null) {
  const setSessionHistory = useAppStore(s => s.setSessionHistory)

  return useQuery({
    queryKey: ['sessions', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const sessions = await apiClient.getSessions(teacherId)
      setSessionHistory(sessions)
      return sessions
    },
    enabled: Boolean(teacherId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// ── Feedback hook ─────────────────────────────────────────────────────────────
export function useSubmitFeedback() {
  const updateSessionFeedback = useAppStore(s => s.updateSessionFeedback)
  const showToast = useAppStore(s => s.showToast)
  const language = useAppStore(s => s.language)

  return useMutation({
    mutationFn: (req: FeedbackRequest) => apiClient.submitFeedback(req),
    onSuccess: (_, req) => {
      updateSessionFeedback(req.session_id, req.feedback as 0 | 1)
      const msg = language === 'hi' ? '🙏 आपकी राय के लिए धन्यवाद!' : '🙏 Thank you for your feedback!'
      showToast(msg, 'success')
    },
    onError: () => { /* silent fail — feedback is best-effort */ },
  })
}