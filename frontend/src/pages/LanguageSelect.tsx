import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import type { LanguageKey } from '../api/types'

export default function LanguageSelect() {
  const { t } = useTranslation()
  const setLanguage = useAppStore(s => s.setLanguage)
  const navigate = useAppStore(s => s.navigate)
  const isAuthenticated = useAppStore(s => s.isAuthenticated)

  const handleSelect = (lang: LanguageKey) => {
    setLanguage(lang)
    navigate(isAuthenticated ? 'home' : 'otp-input')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EAF4FB 0%, #F8F9FA 40%, #FEF9F0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
      }}
      className="animate-fade-up"
    >
      {/* Micro-illustration — school scene */}
      <div
        style={{
          fontSize: '64px',
          lineHeight: 1,
          marginBottom: '8px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))',
        }}
        className="animate-stagger"
        role="img"
        aria-label="School illustration"
      >
        🏫
      </div>

      <div
        style={{ display: 'flex', gap: '12px', marginBottom: '28px', fontSize: '28px' }}
        aria-hidden="true"
      >
        <span style={{ animationDelay: '0.1s' }} className="animate-fade-up">📚</span>
        <span style={{ animationDelay: '0.2s' }} className="animate-fade-up">✏️</span>
        <span style={{ animationDelay: '0.3s' }} className="animate-fade-up">🌟</span>
      </div>

      {/* App name */}
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 800,
          color: 'var(--color-primary)',
          margin: '0 0 4px',
          fontFamily: 'var(--font-devanagari)',
          letterSpacing: '-0.5px',
        }}
      >
        साथी शिक्षक
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          margin: '0 0 4px',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        SaathiShikshak
      </p>

      {/* Tagline */}
      <p
        style={{
          fontSize: '16px',
          color: 'var(--color-text-secondary)',
          margin: '12px 0 40px',
          lineHeight: 1.6,
          maxWidth: '280px',
          fontFamily: 'var(--font-devanagari)',
        }}
      >
        हर सवाल का जवाब। रोज़। आपकी भाषा में। 🙏
      </p>

      {/* Language selection prompt */}
      <p
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {t('language_select.choose')}
      </p>

      {/* Language buttons */}
      <div
        style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '340px' }}
        className="animate-stagger"
      >
        {/* Hindi button */}
        <button
          onClick={() => handleSelect('hi')}
          style={{
            flex: 1,
            padding: '20px 12px',
            borderRadius: '20px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 8px 24px rgba(27, 79, 114, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            minHeight: '96px',
          }}
          onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Select Hindi language"
        >
          <span style={{ fontSize: '28px' }}>🇮🇳</span>
          <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-devanagari)' }}>
            हिन्दी
          </span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>Hindi</span>
        </button>

        {/* English button */}
        <button
          onClick={() => handleSelect('en')}
          style={{
            flex: 1,
            padding: '20px 12px',
            borderRadius: '20px',
            background: 'white',
            color: 'var(--color-primary)',
            border: '2px solid var(--color-primary)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 8px 24px rgba(27, 79, 114, 0.12)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            minHeight: '96px',
          }}
          onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Select English language"
        >
          <span style={{ fontSize: '28px' }}>🌐</span>
          <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-sans)' }}>
            English
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>अंग्रेज़ी</span>
        </button>
      </div>

      <p
        style={{
          marginTop: '28px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-devanagari)',
        }}
      >
        {t('language_select.change_later')}
      </p>
    </div>
  )
}