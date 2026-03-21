import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const { signInWithEmail, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    } catch (err) {
      setError('Código inválido ou expirado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <h1 style={styles.logoText}>EAS Expert</h1>
        </div>
        <p style={styles.subtitle}>Agente de Suporte e Treinamento Técnico</p>

        {step === 'email' ? (
          <form onSubmit={handleEmail} style={styles.form}>
            <label style={styles.label}>E-mail corporativo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={styles.input}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={styles.btn} disabled={loading}>
              {loading ? 'Enviando...' : 'Receber código de acesso'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp} style={styles.form}>
            <p style={styles.info}>
              Código enviado para <strong>{email}</strong>
            </p>
            <label style={styles.label}>Código de verificação</label>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              style={{ ...styles.input, textAlign: 'center', letterSpacing: '0.4em', fontSize: '20px' }}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={styles.btn} disabled={loading || otp.length < 6}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setOtp(''); setError('') }}
              style={styles.back}>
              ← Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' },
  card: { width: '100%', maxWidth: '400px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 32px' },
  logo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  logoIcon: { fontSize: '32px' },
  logoText: { fontSize: '24px', fontWeight: '700', color: 'var(--text)' },
  subtitle: { color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--text-dim)' },
  input: { width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '15px' },
  btn: { width: '100%', justifyContent: 'center', padding: '13px' },
  error: { color: 'var(--danger)', fontSize: '13px' },
  info: { color: 'var(--text-dim)', fontSize: '14px' },
  back: { background: 'none', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', textDecoration: 'underline', cursor: 'pointer' }
}
