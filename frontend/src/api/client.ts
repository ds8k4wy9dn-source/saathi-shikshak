import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type { AuthVerifyRequest, FeedbackRequest, QueryRequest, QueryResponse, SessionRecord, TeacherProfile } from './types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,  // 30s — Claude can take up to 10s
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor: extract data, normalize errors
axiosInstance.interceptors.response.use(
  res => res,
  (error: AxiosError<{ detail: unknown }>) => {
    const detail = error.response?.data?.detail
    if (error.response?.status === 429) {
      const msg = typeof detail === 'object' && detail !== null
        ? (detail as Record<string, string>)['message_hi'] || 'Rate limit exceeded'
        : 'Rate limit exceeded'
      throw new Error(`RATE_LIMIT:${msg}`)
    }
    if (error.response?.status === 401) {
      throw new Error('AUTH_ERROR:Please log in again')
    }
    throw error
  }
)

export const apiClient = {
  // Health check
  health: () => axiosInstance.get('/health').then(r => r.data),

  // Auth
  verifyAuth: (req: AuthVerifyRequest): Promise<TeacherProfile> =>
    axiosInstance.post('/auth/verify', req).then(r => r.data),

  // Main query
  query: (req: QueryRequest): Promise<QueryResponse> =>
    axiosInstance.post('/query', req).then(r => r.data),

  // Session history
  getSessions: (teacherId: string): Promise<SessionRecord[]> =>
    axiosInstance.get(`/session/${teacherId}`).then(r => r.data),

  // Feedback
  submitFeedback: (req: FeedbackRequest): Promise<void> =>
    axiosInstance.post('/feedback', req).then(r => r.data),

  // Offline scenarios
  getScenarios: (): Promise<{ scenarios: import('../offline/db').OfflineScenario[]; count: number }> =>
    axiosInstance.get('/scenarios').then(r => r.data),
}