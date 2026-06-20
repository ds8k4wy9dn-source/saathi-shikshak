import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth } from '../firebase'
import { apiClient } from '../api/client'
import { useAppStore } from '../store/useAppStore'

export default function OtpInput() {
  const { t } = useTranslation()
  const setAuthenticated = useAppStore(s => s.setAuthenticated)
  const navigate = useAppStore(s => s.navigate)
  const language = useAppStore(s => s.language)
  const showToast = useAppStore(s => s.showToast)

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const initRecaptcha = () => {
    if (recaptchaRef.current) return recaptchaRef.current
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    })
    recaptchaRef.current = verifier
    return verifier
  }

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\s/g, '')
    if (!cleaned.match(/^\+?[1-9]\d{9,14}$/)) {
      showToast(t('auth.error_invalid_phone'), 'error')
      return
    }
    const fullPhone = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`

    setLoading(true)
    try {
      const appVerifier = initRecaptcha()
      const confirmResult = await signInWithPhoneNumber(auth, fullPhone, appVerifier)
      confirmationRef.current = confirmResult
      setStep('otp')
      setCountdown(30)
      showToast(t('auth.otp_hint'), 'success')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      const errMsg = code === 'auth/too-many-requests'
        ? t('auth.error_many')
        : t('auth.error_invalid_phone')
      showToast(errMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!confirmationRef.current) return
    setLoading(true)
    try {
      const userCred = await confirmationRef.current.confirm(otp)
      const idToken = await userCred.user.getIdToken()

      const profile = await apiClient.verifyAuth({
        id_token: idToken,
        language_pref: language,
      })
      setAuthenticated(profile)
      // navigate happens inside setAuthenticated (→ onboarding or home)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      const errMsg = code === 'auth/invalid-verification-code'
        ? t('auth.error_invalid')
        : code === 'auth/code-expired'
        ? t('auth.error_expired')
        : t('errors.generic')
      showToast(errMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EAF4FB 0%, #F8F9FA 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '40px 24px',
      }}
      className="animate-fade-up"
    >
      {/* Back button */}
      <button
        onClick={() => navigate('language-select')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '24px', padding: 0, alignSelf: 'flex-start' }}
      >
        {t('common.back')}
      </button>

      <div style={{ fontSize: '56px', marginBottom: '16px' }}>📱</div>

      {step === 'phone' ? (
        <>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-devanagari)', margin: '0 0 8px' }}>
            {t('auth.title')}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', margin: '0 0 32px', fontFamily: 'var(--font-devanagari)' }}>
            {t('auth.subtitle')}
          </p>

          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>
            {t('auth.phone_label')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={t('auth.phone_placeholder')}
            style={{
              width: '100%', padding: '16px', borderRadius: '16px',
              border: `2px solid ${phone ? 'var(--color-primary)' : 'var(--color-border)'}`,
              fontSize: '18px', outline: 'none', marginBottom: '20px',
              boxSizing: 'border-box', fontFamily: 'var(--font-sans)',
              transition: 'border-color 0.2s ease',
            }}
            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
            autoFocus
            inputMode="tel"
            autoComplete="tel"
          />

          <button
            onClick={handleSendOtp}
            disabled={loading || !phone}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px',
              background: phone ? 'var(--color-primary)' : 'var(--color-border)',
              color: 'white', fontWeight: 800, fontSize: '17px', border: 'none',
              cursor: phone ? 'pointer' : 'default',
              fontFamily: 'var(--font-devanagari)',
              boxShadow: phone ? '0 8px 24px rgba(27,79,114,0.35)' : 'none',
            }}
          >
            {loading ? t('auth.sending') : t('auth.send_otp')}
          </button>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-devanagari)', margin: '0 0 8px' }}>
            {t('auth.otp_label')}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', margin: '0 0 32px', fontFamily: 'var(--font-devanagari)' }}>
            {t('auth.otp_hint')}
          </p>

          <input
            type="number"
            value={otp}
            onChange={e => setOtp(e.target.value.slice(0, 6))}
            placeholder="• • • • • •"
            style={{
              width: '100%', padding: '20px', borderRadius: '16px',
              border: `2px solid ${otp.length === 6 ? 'var(--color-success)' : 'var(--color-border)'}`,
              fontSize: '28px', outline: 'none', marginBottom: '20px',
              textAlign: 'center', letterSpacing: '12px', fontWeight: 700,
              boxSizing: 'border-box',
            }}
            onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
            autoFocus
            inputMode="numeric"
          />

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%', padding: '18px', borderRadius: '16px',
              background: otp.length === 6 ? 'var(--color-success)' : 'var(--color-border)',
              color: 'white', fontWeight: 800, fontSize: '17px', border: 'none',
              cursor: otp.length === 6 ? 'pointer' : 'default',
              fontFamily: 'var(--font-devanagari)',
              marginBottom: '16px',
            }}
          >
            {loading ? t('auth.verifying') : t('auth.verify')}
          </button>

          <button
            onClick={() => { if (countdown === 0) { setStep('phone'); setOtp('') } }}
            disabled={countdown > 0}
            style={{
              background: 'none', border: 'none', cursor: countdown === 0 ? 'pointer' : 'default',
              color: countdown === 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-devanagari)',
            }}
          >
            {countdown > 0 ? t('auth.resend_in', { seconds: countdown }) : t('auth.resend')}
          </button>
        </>
      )}

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
    </div>
  )
}