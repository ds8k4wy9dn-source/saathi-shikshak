import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { useSubmitFeedback } from '../api/hooks'

interface BlockProps {
  id: string
  icon: string
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ResponseBlock({ id, icon, title, isOpen, onToggle, children }: BlockProps) {
  return (
    <div
      className="response-card"
      style={{ marginBottom: '12px', animation: `card-enter 0.35s ease both` }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={isOpen}
        aria-controls={`block-${id}`}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{icon}</span>
          <span style={{
            fontWeight: 700, fontSize: '16px',
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-devanagari)',
          }}>
            {title}
          </span>
        </span>
        <span style={{
          fontSize: '14px', color: 'var(--color-text-secondary)',
          transition: 'transform 0.25s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          ▼
        </span>
      </button>

      <div
        id={`block-${id}`}
        style={{
          maxHeight: isOpen ? '600px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ height: '12px' }} />
          {children}
        </div>
      </div>
    </div>
  )
}

export default function Response() {
  const { t } = useTranslation()
  const response = useAppStore(s => s.currentResponse)
  const navigate = useAppStore(s => s.navigate)
  const setPendingQuery = useAppStore(s => s.setPendingQuery)

  const [openBlocks, setOpenBlocks] = useState<Set<string>>(new Set(['immediate']))
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  const { mutate: submitFeedback } = useSubmitFeedback()

  if (!response) {
    navigate('home')
    return null
  }

  const toggle = (id: string) => {
    setOpenBlocks(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleFeedback = (val: 0 | 1) => {
    if (!feedbackGiven) {
      submitFeedback({ session_id: response.session_id, feedback: val })
      setFeedbackGiven(true)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-primary)',
        padding: '20px 20px 28px',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button
            onClick={() => { navigate('home'); setPendingQuery('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 600 }}
          >
            {t('response.ask_again')}
          </button>
          {response.from_cache && (
            <span style={{
              background: 'var(--color-secondary)', color: 'white',
              padding: '3px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
            }}>
              {t('response.from_cache_badge')}
            </span>
          )}
        </div>
        <h1 style={{
          color: 'white', margin: 0, fontSize: '20px', fontWeight: 800,
          fontFamily: 'var(--font-devanagari)',
        }}>
          {t('response.header')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', margin: '4px 0 0', fontSize: '12px' }}>
          {t('response.response_time', { ms: response.response_time_ms })}
        </p>
      </div>

      {/* Response blocks */}
      <div style={{ flex: 1, padding: '16px 16px 0' }} className="animate-stagger">

        {/* Block 1: Immediate Steps — expanded by default */}
        <ResponseBlock
          id="immediate"
          icon="⚡"
          title={response.immediate_steps.title || t('response.blocks.immediate')}
          isOpen={openBlocks.has('immediate')}
          onToggle={() => toggle('immediate')}
        >
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {response.immediate_steps.steps.map((step, i) => (
              <li key={i} style={{
                marginBottom: '10px', fontSize: '15px', lineHeight: 1.65,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-devanagari)',
              }}>
                {step}
              </li>
            ))}
          </ol>
        </ResponseBlock>

        {/* Block 2: Classroom Activity */}
        <ResponseBlock
          id="activity"
          icon="🎯"
          title={response.classroom_activity.title || t('response.blocks.activity')}
          isOpen={openBlocks.has('activity')}
          onToggle={() => toggle('activity')}
        >
          <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: 1.65, fontFamily: 'var(--font-devanagari)' }}>
            {response.classroom_activity.activity}
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ background: '#F0F8FF', borderRadius: '10px', padding: '8px 12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                📦 {t('response.materials_label')}:{' '}
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-devanagari)' }}>
                {response.classroom_activity.materials}
              </span>
            </div>
            <div style={{ background: '#FFF8F0', borderRadius: '10px', padding: '8px 12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                ⏱ {t('response.time_label')}:{' '}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-secondary)' }}>
                {response.classroom_activity.time_required}
              </span>
            </div>
          </div>
        </ResponseBlock>

        {/* Block 3: Inclusion Strategy */}
        <ResponseBlock
          id="inclusion"
          icon="🤝"
          title={response.inclusion_strategy.title || t('response.blocks.inclusion')}
          isOpen={openBlocks.has('inclusion')}
          onToggle={() => toggle('inclusion')}
        >
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.65, fontFamily: 'var(--font-devanagari)' }}>
            {response.inclusion_strategy.strategy}
          </p>
        </ResponseBlock>

        {/* Block 4: Reflection */}
        <ResponseBlock
          id="reflection"
          icon="💭"
          title={response.reflection_prompt.title || t('response.blocks.reflection')}
          isOpen={openBlocks.has('reflection')}
          onToggle={() => toggle('reflection')}
        >
          <p style={{
            margin: 0, fontSize: '16px', lineHeight: 1.7,
            fontStyle: 'italic', color: 'var(--color-primary)',
            fontFamily: 'var(--font-devanagari)',
          }}>
            "{response.reflection_prompt.question}"
          </p>
        </ResponseBlock>

        {/* Block 5: Source — always visible */}
        <div style={{
          padding: '12px 16px', borderRadius: '12px',
          background: 'white', border: '1px solid var(--color-border)',
          marginBottom: '16px',
          display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <span style={{ fontSize: '18px' }}>📖</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              {response.source_citation.title || t('response.blocks.source')}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontStyle: 'italic' }}>
              {response.source_citation.reference}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1.5px solid var(--color-border)',
          padding: '20px', marginBottom: '24px', textAlign: 'center',
        }}>
          {feedbackGiven ? (
            <p style={{ margin: 0, fontSize: '16px', fontFamily: 'var(--font-devanagari)', color: 'var(--color-success)', fontWeight: 700 }}>
              {t('response.feedback_thanks')}
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 14px', fontSize: '15px', fontFamily: 'var(--font-devanagari)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {t('response.feedback_question')}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleFeedback(1)}
                  style={{
                    flex: 1, maxWidth: '160px', padding: '12px',
                    borderRadius: '12px', border: '2px solid var(--color-success)',
                    background: 'white', cursor: 'pointer', fontWeight: 700,
                    fontSize: '14px', fontFamily: 'var(--font-devanagari)',
                    color: 'var(--color-success)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseDown={e => (e.currentTarget.style.background = '#E8F8F0')}
                  onMouseUp={e => (e.currentTarget.style.background = 'white')}
                >
                  {t('response.feedback_yes')}
                </button>
                <button
                  onClick={() => handleFeedback(0)}
                  style={{
                    flex: 1, maxWidth: '160px', padding: '12px',
                    borderRadius: '12px', border: '2px solid var(--color-border)',
                    background: 'white', cursor: 'pointer', fontWeight: 600,
                    fontSize: '14px', fontFamily: 'var(--font-devanagari)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {t('response.feedback_no')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}