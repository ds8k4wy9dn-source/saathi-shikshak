import { useTranslation } from 'react-i18next'

export default function LoadingScreen() {
  const { t } = useTranslation()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(27, 79, 114, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '20px',
      }}
      role="status"
      aria-label={t('common.thinking')}
      className="animate-scale-in"
    >
      <div style={{ fontSize: '56px', animation: 'celebration-bounce 1.2s ease infinite' }}>
        🧠
      </div>
      <p style={{
        color: 'white', fontSize: '20px', fontWeight: 700,
        fontFamily: 'var(--font-devanagari)',
        animation: 'fade-slide-up 0.4s ease both',
      }}>
        {t('common.thinking')}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.65)',
              animation: `fade-slide-up 0.6s ease ${i * 0.2}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  )
}