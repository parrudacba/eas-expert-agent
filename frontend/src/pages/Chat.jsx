import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Chat() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    api.getSessions().then(r => setSessions(r.sessions || []))
  }, [])

  useEffect(() => {
    if (sessionId) {
      api.getHistory(sessionId).then(r => setMessages(r.messages || []))
    } else {
      setMessages([])
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || !sessionId || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: userMsg, created_at: new Date() }])
    setLoading(true)
    try {
      const { response } = await api.sendMessage({ sessionId, message: userMsg })
      setMessages(m => [...m, { role: 'assistant', content: response, created_at: new Date() }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `Erro: ${err.message}`, created_at: new Date() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={styles.layout}>
      {/* Sessions sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar</button>
          <h2 style={styles.sidebarTitle}>Conversas</h2>
        </div>
        <div style={styles.sessionList}>
          {sessions.map(s => (
            <button key={s.id} onClick={() => navigate(`/chat/${s.id}`)}
              style={{ ...styles.sessionItem, ...(s.id === sessionId ? styles.sessionActive : {}) }}>
              <span style={styles.sessionIcon}>{s.mode === 'support' ? '🔧' : '🎓'}</span>
              <div style={styles.sessionInfo}>
                <span style={styles.sessionSpecialty}>{s.specialties?.name || 'Geral'}</span>
                <span style={styles.sessionDate}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </button>
          ))}
          {sessions.length === 0 && <p style={styles.empty}>Nenhuma conversa ainda</p>}
        </div>
        <div style={styles.sidebarUser}>
          <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
          <button onClick={signOut} style={styles.signOut}>Sair</button>
        </div>
      </aside>

      {/* Chat area */}
      <div style={styles.chatArea}>
        {!sessionId ? (
          <div style={styles.empty2}>
            <span style={{ fontSize: 48 }}>💬</span>
            <p>Inicie uma nova conversa pelo Dashboard</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Ir para Dashboard</button>
          </div>
        ) : (
          <>
            <div style={styles.messages}>
              {messages.length === 0 && !loading && (
                <div style={styles.welcome}>
                  <span style={{ fontSize: 40 }}>👋</span>
                  <p style={{ fontWeight: 600, fontSize: 18 }}>Como posso ajudar?</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Descreva o problema ou o que deseja aprender.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ ...styles.msg, ...(m.role === 'user' ? styles.msgUser : styles.msgAssistant) }}>
                  {m.role === 'assistant' && <span style={styles.msgAvatar}>⚡</span>}
                  <div style={{ ...styles.bubble, ...(m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant) }}>
                    <p style={styles.msgContent}>{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ ...styles.msg, ...styles.msgAssistant }}>
                  <span style={styles.msgAvatar}>⚡</span>
                  <div style={{ ...styles.bubble, ...styles.bubbleAssistant, ...styles.typing }}>
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={styles.inputArea}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Digite sua mensagem... (Enter para enviar)"
                rows={1}
                style={styles.textarea}
              />
              <button onClick={send} disabled={!input.trim() || loading} className="btn btn-primary" style={styles.sendBtn}>
                Enviar →
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .typing { display: flex; gap: 5px; align-items: center; padding: 14px 18px !important; }
        .typing span { width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: bounce 1.2s infinite; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      `}</style>
    </div>
  )
}

const styles = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: 260, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '16px', borderBottom: '1px solid var(--border)' },
  backBtn: { background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 8 },
  sidebarTitle: { fontSize: 14, fontWeight: 600 },
  sessionList: { flex: 1, overflow: 'auto', padding: '8px' },
  sessionItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', border: 'none', color: 'var(--text)' },
  sessionActive: { background: 'var(--primary-light)' },
  sessionIcon: { fontSize: 18, flexShrink: 0 },
  sessionInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  sessionSpecialty: { fontSize: 13, fontWeight: 500 },
  sessionDate: { fontSize: 11, color: 'var(--text-muted)' },
  empty: { color: 'var(--text-muted)', fontSize: 13, padding: '12px', textAlign: 'center' },
  sidebarUser: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border)' },
  avatar: { width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  signOut: { background: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', border: 'none' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  messages: { flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  welcome: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center', marginTop: '15vh' },
  empty2: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, color: 'var(--text-muted)' },
  msg: { display: 'flex', gap: 12, maxWidth: '80%' },
  msgUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAssistant: { alignSelf: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  bubble: { padding: '12px 16px', borderRadius: 16, maxWidth: '100%' },
  bubbleUser: { background: 'var(--primary)', borderBottomRightRadius: 4 },
  bubbleAssistant: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 },
  msgContent: { fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  inputArea: { display: 'flex', gap: 12, padding: '16px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg)' },
  textarea: { flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '12px 14px', resize: 'none', lineHeight: 1.5, maxHeight: 120 },
  sendBtn: { flexShrink: 0, alignSelf: 'flex-end' }
}
