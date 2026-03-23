import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

function CorrectionModal({ message, question, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [correct, setCorrect] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim() || !correct.trim()) return
    setSaving(true)
    try {
      await api.submitCorrection({
        question: title.trim(),
        originalResponse: message,
        correctResponse: correct.trim()
      })
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={corrStyles.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={corrStyles.modal}>
        <div style={corrStyles.modalHeader}>
          <span style={{ fontSize: 20 }}>🎓</span>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Contribuir Correção</h3>
        </div>
        <p style={corrStyles.modalDesc}>
          Como Expert, você pode corrigir respostas do agente. Sua contribuição será usada para melhorar as próximas respostas.
        </p>

        <label style={corrStyles.fieldLabel}>Título da Correção <span style={{ color: '#e74c3c' }}>*</span></label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Correção sobre tensão de alimentação Ultra 1.8"
          style={corrStyles.input}
          autoFocus
        />

        <label style={corrStyles.fieldLabel}>Correção / Informação Correta <span style={{ color: '#e74c3c' }}>*</span></label>
        <textarea
          value={correct}
          onChange={e => setCorrect(e.target.value)}
          placeholder="Descreva a informação correta que deve substituir ou complementar a resposta..."
          rows={5}
          style={corrStyles.textarea}
        />

        <div style={corrStyles.tip}>
          <span style={{ fontSize: 14 }}>💡</span>
          <span style={{ fontSize: 12, color: '#555' }}>
            Dica: Seja específico e inclua detalhes técnicos. Use a seção de Documentos para adicionar manuais e arquivos de apoio.
          </span>
        </div>

        {error && <p style={{ color: '#e74c3c', fontSize: 12, margin: '4px 0 0' }}>{error}</p>}

        <div style={corrStyles.modalFooter}>
          <button onClick={onCancel} style={corrStyles.btnCancel}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !correct.trim()} style={corrStyles.btnSave}>
            {saving ? 'Salvando...' : '💾 Salvar Correção'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [correcting, setCorrecting] = useState(null) // index of message being corrected
  const [savedCorrection, setSavedCorrection] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const canTrain = profile?.permissions?.train_agent || profile?.role === 'admin'

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
              {messages.map((m, i) => {
                const prevUser = messages.slice(0, i).reverse().find(x => x.role === 'user')
                return (
                  <div key={i} style={{ ...styles.msg, ...(m.role === 'user' ? styles.msgUser : styles.msgAssistant) }}>
                    {m.role === 'assistant' && <span style={styles.msgAvatar}>⚡</span>}
                    <div style={{ maxWidth: '100%' }}>
                      <div style={{ ...styles.bubble, ...(m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant) }}>
                        <p style={styles.msgContent}>{m.content}</p>
                      </div>
                      {m.role === 'assistant' && canTrain && (
                        <div style={{ marginTop: 6 }}>
                          {savedCorrection === i ? (
                            <span style={corrStyles.saved}>✓ Correção salva!</span>
                          ) : (
                            <button onClick={() => setCorrecting(i)} style={corrStyles.trainBtn}>
                              ✏ Corrigir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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

      {correcting !== null && (
        <CorrectionModal
          message={messages[correcting]?.content || ''}
          question={messages.slice(0, correcting).reverse().find(x => x.role === 'user')?.content || ''}
          onSave={() => { setSavedCorrection(correcting); setCorrecting(null) }}
          onCancel={() => setCorrecting(null)}
        />
      )}

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

const corrStyles = {
  trainBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#888', fontSize: 12, display: 'flex', alignItems: 'center',
    gap: 4, padding: '2px 0', textDecoration: 'underline', textDecorationStyle: 'dotted'
  },
  saved: { fontSize: 12, color: '#27ae60', fontWeight: 500 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 14
  },
  modalHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  modalDesc: { fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: '#333' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box'
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, resize: 'vertical', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5
  },
  tip: {
    background: '#eaf4ff', border: '1px solid #c3dff7', borderRadius: 8,
    padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start'
  },
  modalFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnCancel: {
    padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd',
    background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500
  },
  btnSave: {
    padding: '10px 20px', borderRadius: 8, border: 'none',
    background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: 14,
    fontWeight: 600, opacity: 1
  }
}
