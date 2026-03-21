import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import './Login.css'

function NeonBackground() {
  return (
    <div className="login-bg" aria-hidden="true">
      {/* Grid */}
      <div className="login-grid">
        <svg className="login-grid-svg" width="100%" height="100%">
          <defs>
            <pattern id="neon-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neon-grid)" />
        </svg>
      </div>

      {/* Floating orbs */}
      <div className="login-orb orb-1" />
      <div className="login-orb orb-2" />
      <div className="login-orb orb-3" />
      <div className="login-orb orb-4" />
      <div className="login-orb orb-5" />
      <div className="login-orb orb-6" />

      {/* Scanline */}
      <div className="login-scanline" />
    </div>
  )
}

function Logo() {
  return (
    <div className="login-logo">
      <div className="login-logo-icon">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#0066ff" />
            </linearGradient>
          </defs>
          {/* Chat bubble */}
          <rect x="4" y="6" width="28" height="20" rx="5" fill="url(#logo-grad)" />
          <path d="M10 26 L8 32 L16 28" fill="url(#logo-grad)" />
          {/* Signal bars / EAS waves */}
          <rect x="10" y="12" width="2.5" height="8" rx="1.2" fill="white" opacity="0.9" />
          <rect x="14.5" y="10" width="2.5" height="10" rx="1.2" fill="white" opacity="0.9" />
          <rect x="19" y="13" width="2.5" height="7" rx="1.2" fill="white" opacity="0.9" />
          <rect x="23.5" y="11" width="2.5" height="9" rx="1.2" fill="white" opacity="0.9" />
        </svg>
      </div>
      <div>
        <h1 className="login-logo-name">EAS Expert</h1>
        <p className="login-logo-sub">Agente Inteligente Sensorseg</p>
      </div>
    </div>
  )
}

export default function Login() {
  const { signInWithEmail, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(email, otp)
      navigate('/')
    } catch {
      setError('Código inválido ou expirado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <NeonBackground />

      <div className={`login-card ${mounted ? 'login-card--visible' : ''}`}>
        <Logo />

        {step === 'email' ? (
          <form onSubmit={handleEmail} className="login-form">
            <div className="login-field">
              <label className="login-label">E-mail corporativo</label>
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : null}
              {loading ? 'Enviando...' : 'Receber código de acesso'}
            </button>

            <p className="login-hint">
              Acesso restrito a técnicos autorizados.<br />
              Você receberá um código de 6 dígitos por e-mail.
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="login-form">
            <p className="login-sent">
              Código enviado para <strong>{email}</strong>
            </p>

            <div className="login-field">
              <label className="login-label">Código de verificação</label>
              <input
                className="login-input login-otp-input"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading || otp.length < 6}>
              {loading ? <span className="login-spinner" /> : null}
              {loading ? 'Verificando...' : 'Entrar'}
            </button>

            <button
              type="button"
              className="login-back"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
            >
              ← Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  )
}