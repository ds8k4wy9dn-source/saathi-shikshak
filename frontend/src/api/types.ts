// ─── Request types (frontend → backend) ──────────────────────────────────────

export interface QueryRequest {
  teacher_id: string
  query_text: string
  language: 'hi' | 'en'
  grade: string         // '1' through '8'
  subject: SubjectKey
  class_size?: number
  special_context?: string
}

export interface FeedbackRequest {
  session_id: string
  feedback: 0 | 1     // 1 = helpful, 0 = not helpful
}

export interface AuthVerifyRequest {
  id_token: string    // Firebase ID token
  language_pref: 'hi' | 'en'
}

// ─── Response types (backend → frontend) ─────────────────────────────────────

export interface ImmediateSteps {
  title: string
  steps: string[]
}

export interface ClassroomActivity {
  title: string
  activity: string
  materials: string
  time_required: string
}

export interface InclusionStrategy {
  title: string
  strategy: string
}

export interface ReflectionPrompt {
  title: string
  question: string
}

export interface SourceCitation {
  title: string
  reference: string
}

export interface QueryResponse {
  session_id: string
  language: string
  immediate_steps: ImmediateSteps
  classroom_activity: ClassroomActivity
  inclusion_strategy: InclusionStrategy
  reflection_prompt: ReflectionPrompt
  source_citation: SourceCitation
  response_time_ms: number
  from_cache: boolean
}

export interface TeacherProfile {
  teacher_id: string
  phone: string
  name: string | null
  language_pref: 'hi' | 'en'
  grades_taught: string | null
  subjects_taught: string | null
  is_new_user: boolean
}

export interface SessionRecord {
  session_id: string
  query_text: string
  grade: string | null
  subject: string | null
  language: string
  created_at: string
  feedback: number | null
  response_preview: string
}

export interface HealthResponse {
  status: string
  version: string
  service: string
  timestamp: string
}

// ─── App navigation types ─────────────────────────────────────────────────────

export type AppPage =
  | 'language-select'
  | 'otp-input'
  | 'onboarding'
  | 'home'
  | 'response'
  | 'session-history'

export type SubjectKey = 'hindi' | 'mathematics' | 'evs' | 'science' | 'english' | 'general'
export type LanguageKey = 'hi' | 'en'
export type GradeKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'