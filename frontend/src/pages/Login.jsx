import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import './Login.css'

/* ─── Logo Sensorseg ──────────────────────────────────────────── */
function SensorsegLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Círculo externo */}
      <circle cx="26" cy="26" r="22" stroke="#0055cc" strokeWidth="2.5" fill="#eef3ff"/>
      {/* Figura central — sensor / alvo EAS */}
      <circle cx="26" cy="22" r="10" stroke="#0066dd" strokeWidth="2" fill="none"/>
      <circle cx="26" cy="22" r="5"  fill="#0077ff" opacity="0.7"/>
      {/* Barra diagonal "proibido" */}
      <line x1="14" y1="10" x2="38" y2="34" stroke="#0055cc" strokeWidth="2.8" strokeLinecap="round"/>
      {/* Texto Sensorseg abaixo */}
      <text x="26" y="46" textAnchor="middle" fontSize="7" fontWeight="700" fill="#0044aa" fontFamily="Arial,sans-serif">Sensorseg</text>
    </svg>
  )
}

/* ─── Portais EAS nos lados ───────────────────────────────────── */
function GatePanel({ side }) {
  return (
    <div className={`lp2-gate lp2-gate--${side}`} aria-hidden="true">
      <div className="lp2-gate-frame">
        <div className="lp2-gate-arch" />
        <div className="lp2-gate-pillar lp2-gate-pillar--l" />
        <div className="lp2-gate-pillar lp2-gate-pillar--r" />
        <div className="lp2-gate-line" style={{ top: '30%' }} />
        <div className="lp2-gate-line" style={{ top: '55%' }} />
        <div className="lp2-gate-line" style={{ top: '78%' }} />
        <div className="lp2-gate-base" />
      </div>
    </div>
  )
}

/* ─── Formulário de Solicitação de Acesso ─────────────────────── */
function AccessRequestForm({ onBack }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', position: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const formatPhone = (val) => {
    const n = val.replace(/\D/g, '').slice(0, 11)
    if (n.length <= 2)  return n
    if (n.length <= 6)  return `(${n.slice(0,2)}) ${n.slice(2)}`
    if (n.length <= 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
    return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  }

  const handlePhone = (e) => setForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Nome, e-mail e telefone são obrigatórios.')
      return
    }
    setLoading(true)
    try {
      const BASE = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${BASE}/public/access-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao enviar.'); return }
      setSent(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="lp2-form lp2-sent-ok">
        <div className="lp2-sent-icon">✔</div>
        <h3>Solicitação enviada!</h3>
        <p>O administrador avaliará seu pedido e entrará em contato.</p>
        <button className="lp2-link" onClick={onBack}>← Voltar para o login</button>
      </div>
    )
  }

  return (
    <form className="lp2-form" onSubmit={handleSubmit} noValidate>
      <div className="lp2-access-banner">
        <span className="lp2-access-banner-icon">🛡</span>
        <div>
          <strong>Solicitar Acesso</strong>
          <p>Seu email ainda não está autorizado. Preencha o formulário abaixo para solicitar acesso.</p>
        </div>
      </div>

      <div className="lp2-row-2">
        <div className="lp2-field">
          <label className="lp2-label">Nome completo <span className="lp2-req">*</span></label>
          <input className="lp2-input" placeholder="Seu nome" value={form.name} onChange={set('name')} required />
        </div>
      </div>

      <div className="lp2-field">
        <label className="lp2-label">Email <span className="lp2-req">*</span></label>
        <input className="lp2-input" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
      </div>

      <div className="lp2-field">
        <label className="lp2-label">Telefone <span className="lp2-req">*</span></label>
        <input className="lp2-input" placeholder="(99) 99999-9999" value={form.phone} onChange={handlePhone} required />
      </div>

      <div className="lp2-row-2">
        <div className="lp2-field">
          <label className="lp2-label">Empresa</label>
          <input className="lp2-input" placeholder="Sua empresa" value={form.company} onChange={set('company')} />
        </div>
        <div className="lp2-field">
          <label className="lp2-label">Cargo</label>
          <input className="lp2-input" placeholder="Seu cargo" value={form.position} onChange={set('position')} />
        </div>
      </div>

      <div className="lp2-field">
        <label className="lp2-label">Por que você precisa de acesso?</label>
        <textarea
          className="lp2-input lp2-textarea"
          placeholder="Descreva brevemente o motivo da sua solicitação..."
          value={form.reason}
          onChange={set('reason')}
          rows={3}
        />
      </div>

      {error && <div className="lp2-error">{error}</div>}

      <button type="submit" className="lp2-btn lp2-btn--orange" disabled={loading}>
        {loading ? <span className="lp2-spinner" /> : '✈ '}
        {loading ? 'Enviando...' : 'Enviar Solicitação'}
      </button>

      <button type="button" className="lp2-link" onClick={onBack}>
        Voltar para o login
      </button>
    </form>
  )
}

/* ─── Formulário Entrar (email → OTP) ────────────────────────── */
function LoginForm({ onRequestAccess }) {
  const { signInWithEmail, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const otpRef = useRef(null)

  useEffect(() => { if (step === 'otp') otpRef.current?.focus() }, [step])

  const handleEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email)
      setStep('otp')
    } catch (err) {
      setError(err.message || 'Erro ao enviar código.')
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

  if (step === 'otp') {
    return (
      <form className="lp2-form" onSubmit={handleOtp}>
        <div className="lp2-otp-info">
          Código enviado para <strong>{email}</strong>
        </div>
        <div className="lp2-field">
          <label className="lp2-label">Código de verificação</label>
          <input
            ref={otpRef}
            className="lp2-input lp2-otp-input"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>
        {error && <div className="lp2-error">{error}</div>}
        <button type="submit" className="lp2-btn lp2-btn--primary" disabled={loading || otp.length < 6}>
          {loading ? <span className="lp2-spinner lp2-spinner--white" /> : '→ '}
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
        <button type="button" className="lp2-link" onClick={() => { setStep('email'); setOtp(''); setError('') }}>
          ← Voltar
        </button>
      </form>
    )
  }

  return (
    <form className="lp2-form" onSubmit={handleEmail}>
      <div className="lp2-field">
        <label className="lp2-label">Email</label>
        <input
          className="lp2-input"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      {error && <div className="lp2-error">{error}</div>}
      <button type="submit" className="lp2-btn lp2-btn--primary" disabled={loading}>
        {loading ? <span className="lp2-spinner lp2-spinner--white" /> : '→ '}
        {loading ? 'Enviando...' : 'Entrar'}
      </button>
      <button type="button" className="lp2-link" onClick={onRequestAccess}>
        Não tem autorização? Solicitar acesso →
      </button>
    </form>
  )
}

/* ─── Formulário Cadastrar ────────────────────────────────────── */
function RegisterForm({ onRequestAccess }) {
  return (
    <div className="lp2-form">
      <p className="lp2-register-info">
        Apenas emails autorizados pelo administrador podem criar conta.
      </p>
      <button type="button" className="lp2-link lp2-link--cyan" onClick={onRequestAccess}>
        Não tem autorização? Solicitar acesso →
      </button>
    </div>
  )
}

/* ─── Componente principal ────────────────────────────────────── */
export default function Login() {
  const [tab, setTab] = useState('login')       // 'login' | 'register'
  const [showRequest, setShowRequest] = useState(false)

  const handleRequestAccess = () => setShowRequest(true)
  const handleBack = () => setShowRequest(false)

  return (
    <div className="lp2-root">
      {/* Background */}
      <div className="lp2-bg" aria-hidden="true">
        <div className="lp2-bg-glow lp2-bg-glow--tl" />
        <div className="lp2-bg-glow lp2-bg-glow--br" />
      </div>

      {/* Portais EAS decorativos */}
      <GatePanel side="left" />
      <GatePanel side="right" />

      {/* Card central */}
      <div className="lp2-wrapper">
        <div className="lp2-card">

          {/* Logo */}
          <div className="lp2-logo-box">
            <SensorsegLogo />
          </div>

          {/* Título */}
          <h1 className="lp2-title">EAS Expert</h1>
          <p className="lp2-subtitle">🤖 Assistente Inteligente Sensorseg ⚡</p>

          {/* Tabs (ocultas quando está em solicitar acesso) */}
          {!showRequest && (
            <div className="lp2-tabs" role="tablist">
              <button
                role="tab"
                className={`lp2-tab ${tab === 'login' ? 'lp2-tab--active' : 'lp2-tab--inactive'}`}
                onClick={() => setTab('login')}
              >
                → Entrar
              </button>
              <button
                role="tab"
                className={`lp2-tab ${tab === 'register' ? 'lp2-tab--active' : 'lp2-tab--inactive'}`}
                onClick={() => setTab('register')}
              >
                👤 Cadastrar
              </button>
            </div>
          )}

          {/* Conteúdo */}
          {showRequest ? (
            <AccessRequestForm onBack={handleBack} />
          ) : tab === 'login' ? (
            <LoginForm onRequestAccess={handleRequestAccess} />
          ) : (
            <RegisterForm onRequestAccess={handleRequestAccess} />
          )}
        </div>

        {/* Rodapé */}
        <p className="lp2-footer">© 2026 Sensorseg® – Todos os direitos reservados</p>
      </div>

      {/* Linha de scan no rodapé */}
      <div className="lp2-scanline" aria-hidden="true" />
    </div>
  )
}