import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import './Login.css'

/* ── Decorative EAS gate panels ── */
function FloatingGates() {
  return (
    <>
      <div className="lp-gate lp-gate--left" aria-hidden="true">
        <div className="lp-gate-inner">
          <div className="lp-gate-top" />
          <div className="lp-gate-body" />
          <div className="lp-gate-bottom" />
        </div>
      </div>
      <div className="lp-gate lp-gate--right" aria-hidden="true">
        <div className="lp-gate-inner">
          <div className="lp-gate-top" />
          <div className="lp-gate-body" />
          <div className="lp-gate-bottom" />
        </div>
      </div>
    </>
  )
}

/* ── Logo block ── */
function LogoBlock() {
  return (
    <div className="lp-logo-block">
      <div className="lp-logo-box">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          {/* Sensorseg-style shield/sensor icon */}
          <circle cx="22" cy="22" r="20" fill="#0a1a3a" stroke="#0066cc" strokeWidth="1.5" />
          {/* EAS waves */}
          <path d="M13 22 Q13 14 22 14 Q31 14 31 22" stroke="#0088ff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M16 22 Q16 17 22 17 Q28 17 28 22" stroke="#00aaff" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Center dot */}
          <circle cx="22" cy="22" r="3" fill="#00ccff" />
          {/* Gate bars */}
          <rect x="15" y="24" width="3" height="8" rx="1.5" fill="#0077ee" />
          <rect x="26" y="24" width="3" height="8" rx="1.5" fill="#0077ee" />
          <rect x="14" y="31" width="16" height="2" rx="1" fill="#005bcc" />
        </svg>
      </div>
      <h1 className="lp-title">EAS Expert</h1>
      <p className="lp-subtitle">🤖 Assistente Inteligente Sensorseg ⚡</p>
    </div>
  )
}

/* ── Tab row ── */
function TabRow({ activeTab, onTabChange }) {
  return (
    <div className="lp-tabs" role="tablist">
      <button
        role="tab"
        aria-selected={activeTab === 'login'}
        className={`lp-tab ${activeTab === 'login' ? 'lp-tab--active' : 'lp-tab--inactive'}`}
        onClick={() => onTabChange('login')}
      >
        &#8594; Entrar
      </button>
      <button
        role="tab"
        aria-selected={false}
        className="lp-tab lp-tab--inactive"
        title="Acesso via convite — solicite ao administrador"
        onClick={() => onTabChange('cadastrar')}
      >
        &#128100; Cadastrar
      </button>
    </div>
  )
}

/* ── Email step ── */
function EmailForm({ email, setEmail, loading, error, onSubmit, onForgot }) {
  return (
    <form onSubmit={onSubmit} className="lp-form">
      <div className="lp-field">
        <label className="lp-label">Email</label>
        <input
          className="lp-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          autoFocus
        />
      </div>

      {error && <div className="lp-error">{error}</div>}

      <button type="submit" className="lp-btn" disabled={loading}>
        {loading ? <span className="lp-spinner" /> : '→ '}
        {loading ? 'Enviando...' : 'Entrar'}
      </button>

      <button type="button" className="lp-link" onClick={onForgot}>
        Esqueceu o acesso?
      </button>
    </form>
  )
}

/* ── OTP step ── */
function OtpForm({ email, otp, setOtp, loading, error, onSubmit, onBack }) {
  return (
    <form onSubmit={onSubmit} className="lp-form">
      <div className="lp-sent-box">
        Código enviado para <strong>{email}</strong>
      </div>

      <div className="lp-field">
        <label className="lp-label">Código de verificação</label>
        <input
          className="lp-input lp-otp-input"
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

      {error && <div className="lp-error">{error}</div>}

      <button type="submit" className="lp-btn" disabled={loading || otp.length < 6}>
        {loading ? <span className="lp-spinner" /> : '→ '}
        {loading ? 'Verificando...' : 'Verificar código'}
      </button>

      <button type="button" className="lp-link" onClick={onBack}>
        ← Voltar
      </button>
    </form>
  )
}

/* ── Invite info (shown when user clicks Cadastrar) ── */
function InviteInfo({ onBack }) {
  return (
    <div className="lp-form">
      <div className="lp-invite-box">
        <p>&#128274; O acesso é restrito a técnicos autorizados.</p>
        <p>Solicite seu cadastro ao administrador do sistema.</p>
      </div>
      <button type="button" className="lp-link" onClick={onBack}>
        ← Voltar ao login
      </button>
    </div>
  )
}

/* ── Main component ── */
export default function Login() {
  const { signInWithEmail, verifyOtp } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('login')
  const [step, setStep] = useState('email')   // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setError('')
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email)
      setStep('otp')
    } catch (err) {
      setError(err.message || 'Erro ao enviar código. Tente novamente.')
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

  const handleBack = () => {
    setStep('email')
    setOtp('')
    setError('')
    setActiveTab('login')
  }

  const handleForgot = () => {
    setError('Solicite acesso ao administrador do sistema.')
  }

  return (
    <div className="lp-root">
      {/* Radial background glow */}
      <div className="lp-bg-glow" aria-hidden="true" />

      {/* EAS gate silhouettes */}
      <FloatingGates />

      {/* Card wrapper */}
      <div className="lp-center">
        <div className="lp-card">
          <LogoBlock />

          <TabRow activeTab={activeTab} onTabChange={handleTabChange} />

          {activeTab === 'cadastrar' ? (
            <InviteInfo onBack={() => setActiveTab('login')} />
          ) : step === 'email' ? (
            <EmailForm
              email={email}
              setEmail={setEmail}
              loading={loading}
              error={error}
              onSubmit={handleEmail}
              onForgot={handleForgot}
            />
          ) : (
            <OtpForm
              email={email}
              otp={otp}
              setOtp={setOtp}
              loading={loading}
              error={error}
              onSubmit={handleOtp}
              onBack={handleBack}
            />
          )}
        </div>

        <p className="lp-footer">
          © 2026 EAS Expert® – Sensorseg – Todos os direitos reservados
        </p>
      </div>

      {/* Bottom scanline */}
      <div className="lp-scanline-bottom" aria-hidden="true" />
    </div>
  )
}
