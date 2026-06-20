import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { useSessionHistory } from '../api/hooks'

const SUBJECT_ICONS: Record<string, string> = {
  hindi: '🔤', mathematics: '🔢', evs: '🌿',
  science: '🔬', english: '🌐', general: '📚',
}

interface FeedbackBadge {
  label: string
  color: string
}

function getFeedbackBadge(feedback: number | null, t: (k: string) => string): FeedbackBadge | null {
  if (feedback === 1) return { label: t('history.helpful'),     color: 'var(--color-success)' }
  if (feedback === 0) return { label: t('history.not_helpful'), color: 'var(--color-secondary)' }
  return null
}

export default function SessionHistory() {
  const { t } = useTranslation()
  const navigate = useAppStore(s => s.navigate)
  const teacher = useAppStore(s => s.teacher)
  const sessionHistory = useAppStore(s => s.sessionHistory)

  // Fetches from backend on mount and populates Zustand store as a side-effect
  useSessionHistory(teacher?.teacher_id ?? null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-primary)',
        padding: '20px 20px 28px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('home')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 600,
            marginBottom: '10px', padding: 0, display: 'block',
          }}
        >
          {t('history.back')}
        </button>
        <h1 style={{
          color: 'white', margin: 0, fontSize: '22px', fontWeight: 800,
          fontFamily: 'var(--font-devanagari)',
        }}>
          {t('history.title')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', margin: '4px 0 0', fontSize: '13px' }}>
          {sessionHistory.length > 0
            ? `${sessionHistory.length} बातचीत`
            : ''}
        </p>
      </div>

      {/* ── Session list ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>

        {sessionHistory.length === 0 ? (

          /* Empty state */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📝</div>
            <h3 style={{
              fontSize: '18px', fontWeight: 700,
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-devanagari)',
              margin: '0 0 8px',
            }}>
              {t('history.empty_title')}
            </h3>
            <p style={{
              fontSize: '14px', color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-devanagari)', margin: 0,
            }}>
              {t('history.empty_sub')}
            </p>
          </div>

        ) : (

          /* Session cards */
          sessionHistory.map((session, idx) => {
            const feedbackBadge = getFeedbackBadge(session.feedback, t)
            const date = new Date(session.created_at)
            const dateStr = date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })
            const timeStr = date.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={session.session_id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1.5px solid var(--color-border)',
                  padding: '14px 16px',
                  marginBottom: '10px',
                  animation: `fade-slide-up 0.3s ease both`,
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                {/* Top row: subject + grade + date */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {SUBJECT_ICONS[session.subject ?? 'general']}
                    </span>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      color: 'var(--color-primary)',
                    }}>
                      {session.grade ? `${t('history.grade_prefix')} ${session.grade}` : ''}
                      {session.grade && session.subject ? ' · ' : ''}
                      {session.subject
                        ? t(`home.subjects.${session.subject}`)
                        : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {dateStr} {timeStr}
                  </span>
                </div>

                {/* Query text */}
                <p style={{
                  margin: '0 0 8px', fontSize: '14px', lineHeight: 1.55,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-devanagari)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {session.query_text}
                </p>

                {/* Response preview */}
                {session.response_preview && (
                  <p style={{
                    margin: '0 0 8px', fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-devanagari)',
                    padding: '8px', background: '#F8F9FA',
                    borderRadius: '8px', lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    ⚡ {session.response_preview}
                  </p>
                )}

                {/* Feedback badge */}
                {feedbackBadge && (
                  <span style={{
                    fontSize: '12px', fontWeight: 600,
                    color: feedbackBadge.color,
                  }}>
                    {feedbackBadge.label}
                  </span>
                )}
              </div>
            )
          })

        )}
      </div>
    </div>
  )
}