import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import type { SubjectKey } from '../api/types'

const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8']
const SUBJECTS: SubjectKey[] = ['hindi', 'mathematics', 'evs', 'science', 'english', 'general']

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useAppStore(s => s.navigate)
  const setGrade = useAppStore(s => s.setGrade)
  const setSubject = useAppStore(s => s.setSubject)
  const showToast = useAppStore(s => s.showToast)

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set())
  const [selectedSubjects, setSelectedSubjects] = useState<Set<SubjectKey>>(new Set())
  const [celebrating, setCelebrating] = useState(false)

  const toggleGrade = (g: string) => {
    setSelectedGrades(prev => {
      const next = new Set(prev)
      if (next.has(g)) {
        next.delete(g)
      } else {
        next.add(g)
      }
      return next
    })
  }

  const toggleSubject = (s: SubjectKey) => {
    setSelectedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(s)) {
        next.delete(s)
      } else {
        next.add(s)
      }
      return next
    })
  }

  const handleStep1Next = () => {
    if (selectedGrades.size === 0) {
      showToast(t('onboarding.select_at_least_one'), 'error')
      return
    }
    setStep(2)
  }

  const handleFinish = () => {
    if (selectedSubjects.size === 0) {
      showToast(t('onboarding.select_at_least_one'), 'error')
      return
    }
    // Save selections to store
    const sortedGrades = [...selectedGrades].sort()
    setGrade(sortedGrades[Math.floor(sortedGrades.length / 2)])  // default to middle grade
    setSubject([...selectedSubjects][0])  // default to first subject

    // Celebrate!
    setCelebrating(true)
    setTimeout(() => navigate('home'), 900)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EAF4FB 0%, #F8F9FA 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px',
      }}
      className="animate-fade-up"
    >
      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2].map(s => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '4px',
              background: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'background 0.4s ease',
            }}
          />
        ))}
      </div>

      {/* Step 1: Grade selection */}
      {step === 1 && (
        <div className="animate-fade-up">
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏫</div>
          <h2 style={{
            fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)',
            fontFamily: 'var(--font-devanagari)', margin: '0 0 8px'
          }}>
            {t('onboarding.step1_title')}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', margin: '0 0 28px' }}>
            {t('onboarding.step1_subtitle')}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px', marginBottom: '32px',
          }}>
            {GRADES.map(g => {
              const selected = selectedGrades.has(g)
              return (
                <button
                  key={g}
                  onClick={() => toggleGrade(g)}
                  style={{
                    padding: '16px 8px',
                    borderRadius: '14px',
                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: selected ? 'var(--color-primary)' : 'white',
                    color: selected ? 'white' : 'var(--color-text-primary)',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    animation: selected ? 'chip-select 0.25s ease' : 'none',
                  }}
                  aria-pressed={selected}
                  aria-label={`${t('onboarding.grade_prefix')} ${g}`}
                >
                  <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                    {selected ? '✅' : `${g}`}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    {t('onboarding.grade_prefix')} {g}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleStep1Next}
            style={{
              width: '100%', padding: '18px',
              borderRadius: '16px',
              background: selectedGrades.size > 0 ? 'var(--color-primary)' : 'var(--color-border)',
              color: 'white', fontWeight: 700, fontSize: '17px',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-devanagari)',
              transition: 'background 0.2s ease',
            }}
          >
            {t('onboarding.next')}
          </button>
        </div>
      )}

      {/* Step 2: Subject selection */}
      {step === 2 && (
        <div className="animate-fade-up">
          <button
            onClick={() => setStep(1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-primary)', fontSize: '15px', fontWeight: 600,
              marginBottom: '16px', padding: '0',
            }}
          >
            {t('common.back')}
          </button>

          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📚</div>
          <h2 style={{
            fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)',
            fontFamily: 'var(--font-devanagari)', margin: '0 0 8px'
          }}>
            {t('onboarding.step2_title')}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', margin: '0 0 28px' }}>
            {t('onboarding.step2_subtitle')}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '12px', marginBottom: '32px',
          }}>
            {SUBJECTS.map(s => {
              const selected = selectedSubjects.has(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  style={{
                    padding: '18px 12px',
                    borderRadius: '14px',
                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: selected ? 'var(--color-primary)' : 'white',
                    color: selected ? 'white' : 'var(--color-text-primary)',
                    fontWeight: 600, fontSize: '15px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.18s ease',
                    animation: selected ? 'chip-select 0.25s ease' : 'none',
                    fontFamily: 'var(--font-devanagari)',
                  }}
                  aria-pressed={selected}
                >
                  {t(`onboarding.subjects.${s}`)}
                </button>
              )
            })}
          </div>

          <button
            onClick={handleFinish}
            style={{
              width: '100%', padding: '18px',
              borderRadius: '16px',
              background: selectedSubjects.size > 0 ? 'var(--color-secondary)' : 'var(--color-border)',
              color: 'white', fontWeight: 800, fontSize: '18px',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-devanagari)',
              animation: celebrating ? 'celebration-bounce 0.8s ease' : 'none',
              transition: 'background 0.2s ease',
              boxShadow: selectedSubjects.size > 0 ? '0 8px 24px rgba(243,156,18,0.4)' : 'none',
            }}
          >
            {celebrating ? '🎉 शुरू हो रहा है...' : t('onboarding.finish')}
          </button>
        </div>
      )}
    </div>
  )
}