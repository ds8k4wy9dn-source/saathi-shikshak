import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import type { SubjectKey } from '../api/types'

const GRADES = ['1','2','3','4','5','6','7','8']
const SUBJECTS: SubjectKey[] = ['hindi','mathematics','evs','science','english','general']

function getGreeting(lang: string): string {
  const h = new Date().getHours()
  const key = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return lang === 'hi'
    ? { morning: 'सुप्रभात', afternoon: 'नमस्ते', evening: 'शुभ संध्या' }[key]!
    : { morning: 'Good morning', afternoon: 'Hello', evening: 'Good evening' }[key]!
}

export default function Home() {
  const { t } = useTranslation()
  const language = useAppStore(s => s.language)
  const teacher = useAppStore(s => s.teacher)
  const selectedGrade = useAppStore(s => s.selectedGrade)
  const selectedSubject = useAppStore(s => s.selectedSubject)
  const setGrade = useAppStore(s => s.setGrade)
  const setSubject = useAppStore(s => s.setSubject)
  const pendingQuery = useAppStore(s => s.pendingQuery)
  const setPendingQuery = useAppStore(s => s.setPendingQuery)
  const setCurrentResponse = useAppStore(s => s.setCurrentResponse)
  const sessionHistory = useAppStore(s => s.sessionHistory)
  const navigate = useAppStore(s => s.navigate)
  const showToast = useAppStore(s => s.showToast)

  const [isAsking, setIsAsking] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Online/offline detection
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
    lang: language === 'hi' ? 'hi-IN' : 'en-IN',
    onResult: (transcript) => {
      setPendingQuery(transcript)
    },
    onError: (errorKey) => {
      if (errorKey) showToast(t(`errors.${errorKey}`), 'error')
    },
  })

  const handleMicClick = useCallback(() => {
    if (!isSupported) {
      showToast(t('errors.voice_unsupported'), 'error')
      return
    }
    if (isListening) {
      stopListening()
    } else {
      setPendingQuery('')
      startListening()
    }
  }, [isSupported, isListening, stopListening, startListening, setPendingQuery, showToast, t])

  const handleAsk = useCallback(async () => {
    const query = pendingQuery.trim()
    if (!query) {
      showToast(t('errors.empty_query'), 'error')
      return
    }
    if (!teacher?.teacher_id) {
      showToast('Please log in first', 'error')
      return
    }

    setIsAsking(true)
    try {
      // Import lazily to avoid circular deps
      const { apiClient } = await import('../api/client')
      const response = await apiClient.query({
        teacher_id: teacher.teacher_id,
        query_text: query,
        language,
        grade: selectedGrade,
        subject: selectedSubject,
      })
      setCurrentResponse(response)
      setPendingQuery('')
    } catch {
      // Try offline fallback
      try {
        const { findOfflineMatch } = await import('../offline/matcher')
        
        // FIX: DB initialized strictly for side-effects without an unused assignment
        await import('../offline/db') 
        
        const match = await findOfflineMatch(query, selectedGrade, selectedSubject)
        if (match) {
          showToast(`${t('errors.network')} ${t('errors.offline_answer')}`, 'info')
          setCurrentResponse({ ...match.response, from_cache: true })
          setPendingQuery('')
          return
        }
      } catch {
        // Offline matching failed too
      }
      const msg = !navigator.onLine ? `${t('errors.network')} ${t('errors.offline_answer')}` : t('errors.server')
      showToast(msg, 'error')
    } finally {
      setIsAsking(false)
    }
  }, [pendingQuery, teacher, language, selectedGrade, selectedSubject, setCurrentResponse, setPendingQuery, showToast, t])

  const greeting = getGreeting(language)
  const teacherName = teacher?.name

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        background: 'var(--color-primary)',
        padding: '20px 20px 28px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 4px 20px rgba(27,79,114,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            साथी शिक्षक
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
            {!isOnline && (
              <span style={{
                background: 'rgba(255,255,255,0.2)', color: 'white',
                padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              }}>
                {t('home.offline_badge')}
              </span>
            )}
            <button
              onClick={() => navigate('session-history')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600 }}
              aria-label={t('common.history')}
            >
              {t('common.history')}
            </button>
          </div>
        </div>
        <h1 style={{
          color: 'white', margin: 0,
          fontSize: teacherName ? '22px' : '20px',
          fontWeight: 800,
          fontFamily: 'var(--font-devanagari)',
        }}>
          {greeting}{teacherName ? `, ${teacherName}${language === 'hi' ? ' जी' : ''}!` : '!'} 🙏
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: '15px', fontFamily: 'var(--font-devanagari)' }}>
          {t('home.challenge_prompt')}
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Grade selector */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
            {t('home.grade_label')}
          </label>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                style={{
                  flexShrink: 0,
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: `2px solid ${selectedGrade === g ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selectedGrade === g ? 'var(--color-primary)' : 'white',
                  color: selectedGrade === g ? 'white' : 'var(--color-text-secondary)',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '40px',
                }}
                aria-pressed={selectedGrade === g}
                aria-label={`${t('home.grade_label')} ${g}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Subject selector */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
            {t('home.subject_label')}
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SUBJECTS.map(s => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  border: `2px solid ${selectedSubject === s ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                  background: selectedSubject === s ? 'var(--color-secondary)' : 'white',
                  color: selectedSubject === s ? 'white' : 'var(--color-text-secondary)',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  minHeight: '40px',
                  fontFamily: 'var(--font-devanagari)',
                }}
                aria-pressed={selectedSubject === s}
              >
                {t(`home.subjects.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Voice mic button — the hero element */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
          <button
            onClick={handleMicClick}
            disabled={isAsking}
            style={{
              width: '96px', height: '96px',
              borderRadius: '50%',
              background: isListening
                ? 'var(--color-error)'
                : isAsking
                ? 'var(--color-text-secondary)'
                : 'var(--color-primary)',
              border: 'none', cursor: isAsking ? 'not-allowed' : 'pointer',
              fontSize: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isListening
                ? '0 8px 32px rgba(231,76,60,0.45)'
                : '0 8px 32px rgba(27,79,114,0.4)',
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
            }}
            className={
              isListening
                ? 'animate-mic-recording'
                : isAsking
                ? ''
                : 'animate-mic-idle'
            }
            aria-label={isListening ? t('home.mic_listening') : t('home.mic_idle')}
            aria-pressed={isListening}
          >
            {isAsking ? '⏳' : isListening ? '🔴' : '🎤'}
          </button>

          <p style={{
            marginTop: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: isListening ? 'var(--color-error)' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-devanagari)',
            transition: 'color 0.3s ease',
          }}>
            {isAsking
              ? t('home.asking')
              : isListening
              ? t('home.mic_listening')
              : t('home.mic_idle')}
          </p>
        </div>

        {/* Text input */}
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textAreaRef}
            value={pendingQuery}
            onChange={e => setPendingQuery(e.target.value)}
            placeholder={t('home.text_placeholder')}
            rows={3}
            style={{
              width: '100%',
              padding: '14px 100px 14px 16px',
              borderRadius: '16px',
              border: `2px solid ${pendingQuery ? 'var(--color-primary)' : 'var(--color-border)'}`,
              fontSize: '15px',
              fontFamily: 'var(--font-devanagari)',
              resize: 'none',
              outline: 'none',
              background: 'white',
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() }
            }}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !pendingQuery.trim()}
            style={{
              position: 'absolute', right: '8px', bottom: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              background: pendingQuery.trim() ? 'var(--color-primary)' : 'var(--color-border)',
              color: 'white',
              border: 'none', cursor: pendingQuery.trim() ? 'pointer' : 'default',
              fontWeight: 700, fontSize: '13px',
              fontFamily: 'var(--font-devanagari)',
              transition: 'background 0.2s ease',
            }}
          >
            {isAsking ? '⏳' : '→'}
          </button>
        </div>

        {/* Recent sessions */}
        {sessionHistory.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {t('home.recent_title')}
              </span>
              <button
                onClick={() => navigate('session-history')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '13px', fontWeight: 600 }}
              >
                {t('home.history_link')}
              </button>
            </div>
            {sessionHistory.slice(0, 3).map(s => (
              <div
                key={s.session_id}
                style={{
                  padding: '12px 14px', marginBottom: '8px',
                  background: 'white', borderRadius: '12px',
                  border: '1.5px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                onClick={() => { setPendingQuery(s.query_text) }}
              >
                <p style={{
                  margin: 0, fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-devanagari)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.query_text}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {t('home.grade_label')} {s.grade} · {s.subject} · {new Date(s.created_at).toLocaleDateString('hi-IN')}
                </p>
              </div>
            ))}
          </div>
        )}

        {sessionHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📝</div>
            <p style={{ fontSize: '14px', fontFamily: 'var(--font-devanagari)', margin: 0 }}>
              {t('home.no_recent')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}