import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

// ─── Constantes visuais ───────────────────────────────────────────────────────
const SPECIALTY_ICONS = { eas: '📡', cftv: '📷', 'controle-acesso': '🔐' }
const DOC_ICONS = { manual: '📘', technical_doc: '📋', procedure: '📋', bulletin: '📣', other: '📄' }

// ─── Renderizador de Markdown simples ────────────────────────────────────────
function parseInline(text) {
  // Divide por **bold**, *italic* e `code`
  const parts = text.split(/(\*\*.*?\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>
    if (p.startsWith('`')  && p.endsWith('`'))  return (
      <code key={i} style={{ background: 'rgba(0,0,0,0.12)', padding: '1px 5px', borderRadius: 4, fontSize: '0.88em', fontFamily: 'monospace' }}>{p.slice(1, -1)}</code>
    )
    return p
  })
}

function MarkdownText({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />)
      i++; continue
    }

    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '6px 0' }} />)
      i++; continue
    }

    // Bloco de lista
    if (/^[-•]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-•]\s/.test(lines[i])) {
        items.push(
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>•</span>
            <span>{parseInline(lines[i].replace(/^[-•]\s/, ''))}</span>
          </div>
        )
        i++
      }
      elements.push(<div key={`ul-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{items}</div>)
      continue
    }

    elements.push(<div key={`ln-${i}`}>{parseInline(line)}</div>)
    i++
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.65 }}>{elements}</div>
}

// ─── Quick Replies iniciais ao selecionar um documento ───────────────────────
const QR_INICIAIS = [
  'Resumo geral do documento',
  'Procedimento de instalação',
  'Especificações técnicas',
  'Solução de problemas comuns'
]

// ─── Componente: Modal de Correção ────────────────────────────────────────────
function CorrectionModal({ message, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [correct, setCorrect] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim() || !correct.trim()) return
    setSaving(true)
    try {
      await api.submitCorrection({ question: title.trim(), originalResponse: message, correctResponse: correct.trim() })
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
          Como Expert, você pode corrigir respostas do agente. Sua contribuição melhora as próximas respostas.
        </p>
        <label style={corrStyles.fieldLabel}>Título <span style={{ color: '#e74c3c' }}>*</span></label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Correção sobre tensão de alimentação Ultra 1.8"
          style={corrStyles.input} autoFocus />
        <label style={corrStyles.fieldLabel}>Informação Correta <span style={{ color: '#e74c3c' }}>*</span></label>
        <textarea value={correct} onChange={e => setCorrect(e.target.value)}
          placeholder="Descreva a informação correta..."
          rows={5} style={corrStyles.textarea} />
        {error && <p style={{ color: '#e74c3c', fontSize: 12 }}>{error}</p>}
        <div style={corrStyles.footer}>
          <button onClick={onCancel} style={corrStyles.btnCancel}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !correct.trim()} style={corrStyles.btnSave}>
            {saving ? 'Salvando...' : '💾 Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente: Bolha de mensagem ────────────────────────────────────────────
function MessageBubble({ msg, isLast, canTrain, onQuickReply, onCorrect, correctionSaved }) {
  const isUser = msg.role === 'user'
  const hasQR = isLast && msg.quickReplies?.length > 0
  const isTreeMsg = msg.isTree

  return (
    <div style={{ ...styles.msgWrapper, ...(isUser ? styles.msgWrapperUser : {}) }}>
      {/* Avatar do agente */}
      {!isUser && <span style={styles.agentAvatar}>⚡</span>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '78%' }}>
        {/* Bolha de texto */}
        <div style={{
          ...styles.bubble,
          ...(isUser ? styles.bubbleUser : styles.bubbleAgent),
          ...(isTreeMsg && !isUser ? styles.bubbleTree : {})
        }}>
          {isUser
            ? <div style={styles.bubbleText}>{msg.content}</div>
            : <div style={styles.bubbleText}><MarkdownText text={msg.content} /></div>
          }
        </div>

        {/* Quick Replies — só na última mensagem com QRs */}
        {hasQR && (
          <div style={isTreeMsg ? styles.qrTreeGrid : styles.qrChipRow}>
            {msg.quickReplies.map((qr, i) => (
              <button
                key={i}
                style={isTreeMsg ? { ...styles.qrTreeBtn, ...(qr.icon ? {} : {}) } : styles.qrChip}
                onClick={() => onQuickReply(qr)}
              >
                {qr.icon && <span style={{ fontSize: isTreeMsg ? 20 : 14 }}>{qr.icon}</span>}
                <span>{qr.label}</span>
                {qr.badge && <span style={styles.qrBadge}>{qr.badge}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Botão corrigir (só mensagens reais do agente) */}
        {!isUser && !isTreeMsg && canTrain && (
          <div style={{ marginTop: 2 }}>
            {correctionSaved ? (
              <span style={corrStyles.saved}>✓ Correção salva!</span>
            ) : (
              <button onClick={onCorrect} style={corrStyles.trainBtn}>✏ Corrigir</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Chat() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  // Dados da árvore de conhecimento
  const [tree, setTree] = useState([])
  const [treeReady, setTreeReady] = useState(false)

  // Documento selecionado via árvore
  const [selectedDoc, setSelectedDoc] = useState(null)   // { id, title, type }

  // Mensagens (inclui navegação da árvore + chat real)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)

  // Sidebar
  const [sessions, setSessions] = useState([])

  // Correções
  const [correcting, setCorrecting] = useState(null)
  const [savedCorrections, setSavedCorrections] = useState(new Set())

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const treeStartedRef = useRef(false)

  const canTrain = profile?.permissions?.train_agent || profile?.role === 'admin'

  // ── Carrega lista de sessões ───────────────────────────────────────────────
  useEffect(() => {
    api.getSessions().then(r => setSessions(r.sessions || []))
  }, [])

  // ── Carrega árvore de conhecimento ────────────────────────────────────────
  useEffect(() => {
    api.getTree().then(r => { setTree(r.tree || []); setTreeReady(true) })
  }, [])

  // ── Muda de sessão ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { setMessages([]); setSelectedDoc(null); treeStartedRef.current = false; return }
    setSelectedDoc(null)
    treeStartedRef.current = false

    api.getHistory(sessionId).then(r => {
      const hist = r.messages || []
      if (hist.length > 0) {
        // Sessão com histórico: mostra mensagens + permite trocar documento
        setMessages(hist.map(m => ({ ...m, isTree: false })))
        setSelectedDoc({ id: '__history__', title: 'Sessão anterior', type: 'other' })
      } else {
        setMessages([])
      }
    })
  }, [sessionId])

  // ── Inicia árvore quando sessão nova + árvore pronta ─────────────────────
  useEffect(() => {
    if (
      sessionId &&
      treeReady &&
      tree.length > 0 &&
      messages.length === 0 &&
      !selectedDoc &&
      !treeStartedRef.current
    ) {
      treeStartedRef.current = true
      iniciarArvore()
    }
  }, [sessionId, treeReady, tree, messages.length, selectedDoc])

  // ── Scroll automático ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Monta primeira mensagem da árvore ─────────────────────────────────────
  const iniciarArvore = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: 'Para te dar uma resposta precisa, vou localizar o documento correto.\nQual é a especialidade?',
      isTree: true,
      quickReplies: tree.map(s => ({
        label: s.name,
        icon: SPECIALTY_ICONS[s.slug] || '📋',
        treeAction: { step: 'specialty', item: s }
      })),
      created_at: new Date()
    }])
  }, [tree])

  // ── Avança na árvore de decisão ───────────────────────────────────────────
  const avancarArvore = useCallback(async (step, item) => {
    const msgUser = { role: 'user', content: item.name || item.title, isTree: true, created_at: new Date() }

    if (step === 'specialty') {
      if (item.technologies?.length > 0) {
        setMessages(m => [...m, msgUser, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: `Qual tecnologia de ${item.name}?`,
          quickReplies: item.technologies.map(t => ({
            label: t.name, badge: t.frequency,
            treeAction: { step: 'technology', item: t }
          }))
        }])
      } else {
        await buscarDocumentos({ specialtyId: item.id }, msgUser)
      }

    } else if (step === 'technology') {
      if (item.manufacturers?.length > 0) {
        setMessages(m => [...m, msgUser, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: 'Qual fabricante?',
          quickReplies: item.manufacturers.map(mfr => ({
            label: mfr.name,
            treeAction: { step: 'manufacturer', item: mfr }
          }))
        }])
      } else {
        await buscarDocumentos({ technologyId: item.id }, msgUser)
      }

    } else if (step === 'manufacturer') {
      if (item.equipment_models?.length > 0) {
        setMessages(m => [...m, msgUser, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: 'Qual modelo?',
          quickReplies: item.equipment_models.map(mdl => ({
            label: mdl.name + (mdl.model_code ? ` (${mdl.model_code})` : ''),
            treeAction: { step: 'model', item: mdl }
          }))
        }])
      } else {
        await buscarDocumentos({ manufacturerId: item.id }, msgUser)
      }

    } else if (step === 'model') {
      await buscarDocumentos({ modelId: item.id }, msgUser)

    } else if (step === 'document') {
      selecionarDocumento(item, msgUser)
    }
  }, [])

  // ── Busca documentos disponíveis e monta quick replies de documento ────────
  const buscarDocumentos = async (filters, msgUser) => {
    setMessages(m => [...m, msgUser])
    setLoadingDocs(true)
    try {
      const { documents: docs } = await api.getDocuments(filters)
      if (!docs?.length) {
        setMessages(m => [...m, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: 'Não encontrei documentos para este contexto. Consulte o administrador.',
          quickReplies: [{ label: '↩ Recomeçar', treeAction: { step: 'restart', item: null } }]
        }])
      } else if (docs.length === 1) {
        selecionarDocumento(docs[0], null)
      } else {
        setMessages(m => [...m, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: 'Qual documento você precisa consultar?',
          quickReplies: docs.map(d => ({
            label: d.title,
            icon: DOC_ICONS[d.type] || '📄',
            badge: d.type?.replace('_', ' '),
            treeAction: { step: 'document', item: d }
          }))
        }])
      }
    } catch {
      setMessages(m => [...m, {
        role: 'assistant', isTree: true, created_at: new Date(),
        content: 'Erro ao buscar documentos. Tente novamente.',
        quickReplies: [{ label: '↩ Recomeçar', treeAction: { step: 'restart', item: null } }]
      }])
    } finally {
      setLoadingDocs(false)
    }
  }

  // ── Documento selecionado: encerra árvore, abre chat ──────────────────────
  const selecionarDocumento = (doc, msgUser) => {
    const welcomeMsg = {
      role: 'assistant',
      content: `Documento selecionado: ${doc.title}\n\nEstou pronto para responder com base exclusivamente neste documento. Como posso ajudar?`,
      quickReplies: QR_INICIAIS.map(label => ({ label })),
      created_at: new Date()
    }
    setMessages(m => [...m, ...(msgUser ? [msgUser] : []), welcomeMsg])
    setSelectedDoc({ id: doc.id, title: doc.title, type: doc.type })
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Handler de quick reply clicado ────────────────────────────────────────
  const handleQuickReply = useCallback(async (qr) => {
    if (qr.treeAction) {
      if (qr.treeAction.step === 'restart') {
        setSelectedDoc(null)
        treeStartedRef.current = false
        // Força reinício da árvore limpando mensagens
        setMessages([])
        setTimeout(() => {
          treeStartedRef.current = true
          setMessages([{
            role: 'assistant',
            content: 'Qual é a especialidade?',
            isTree: true,
            quickReplies: tree.map(s => ({
              label: s.name, icon: SPECIALTY_ICONS[s.slug] || '📋',
              treeAction: { step: 'specialty', item: s }
            })),
            created_at: new Date()
          }])
        }, 0)
        return
      }
      await avancarArvore(qr.treeAction.step, qr.treeAction.item)
    } else {
      // Quick reply real → envia como mensagem do usuário
      await enviarMensagem(qr.label)
    }
  }, [tree, avancarArvore])

  // ── Envio de mensagem ao agente ───────────────────────────────────────────
  const enviarMensagem = async (texto) => {
    const msg = (texto || input).trim()
    if (!msg || !sessionId || loading || !selectedDoc || selectedDoc.id === '__history__') return
    if (!texto) setInput('')

    setMessages(m => [...m, { role: 'user', content: msg, created_at: new Date() }])
    setLoading(true)
    try {
      const result = await api.sendMessage({
        sessionId,
        message: msg,
        context: { documentId: selectedDoc.id }
      })
      setMessages(m => [...m, {
        role: 'assistant',
        content: result.response,
        quickReplies: (result.quickReplies || []).map(label => ({ label })),
        created_at: new Date()
      }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `Erro: ${err.message}`, created_at: new Date() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const send = () => enviarMensagem(input.trim())
  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  // ── Índice da última mensagem com quick replies ───────────────────────────
  const lastQRIdx = messages.reduce((acc, m, i) => m.quickReplies?.length ? i : acc, -1)

  // ── Trocar documento ──────────────────────────────────────────────────────
  const trocarDocumento = () => {
    setSelectedDoc(null)
    treeStartedRef.current = true
    setMessages(prev => {
      const realMsgs = prev.filter(m => !m.isTree)
      return [...realMsgs, {
        role: 'assistant', isTree: true, created_at: new Date(),
        content: 'Qual é a especialidade?',
        quickReplies: tree.map(s => ({
          label: s.name, icon: SPECIALTY_ICONS[s.slug] || '📋',
          treeAction: { step: 'specialty', item: s }
        }))
      }]
    })
  }

  // ── Placeholder do input ──────────────────────────────────────────────────
  const inputPlaceholder = !selectedDoc
    ? 'Selecione um documento na árvore acima...'
    : selectedDoc.id === '__history__'
    ? 'Clique em "Trocar documento" para fazer novas perguntas'
    : `Pergunta sobre "${selectedDoc.title}"... (Enter para enviar)`

  const inputDisabled = !selectedDoc || selectedDoc.id === '__history__' || loading

  return (
    <div style={styles.layout}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
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
                <span style={styles.sessionName}>{s.specialties?.name || 'Geral'}</span>
                <span style={styles.sessionDate}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </button>
          ))}
          {sessions.length === 0 && <p style={styles.emptyList}>Nenhuma conversa ainda</p>}
        </div>
        <div style={styles.sidebarFooter}>
          <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
          <button onClick={signOut} style={styles.signOut}>Sair</button>
        </div>
      </aside>

      {/* ── Área de chat ────────────────────────────────────────────────── */}
      <div style={styles.chatArea}>
        {!sessionId ? (
          <div style={styles.empty}>
            <span style={{ fontSize: 48 }}>💬</span>
            <p>Inicie uma nova conversa pelo Dashboard</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Ir para Dashboard</button>
          </div>
        ) : (
          <>
            {/* Barra do documento selecionado */}
            {selectedDoc && (
              <div style={styles.docBar}>
                <span>{DOC_ICONS[selectedDoc.type] || '📄'}</span>
                <span style={styles.docBarTitle}>{selectedDoc.title}</span>
                <button style={styles.docBarBtn} onClick={trocarDocumento}>
                  Trocar documento
                </button>
              </div>
            )}

            {/* Mensagens */}
            <div style={styles.messages}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  isLast={i === lastQRIdx}
                  canTrain={canTrain}
                  onQuickReply={handleQuickReply}
                  onCorrect={() => setCorrecting(i)}
                  correctionSaved={savedCorrections.has(i)}
                />
              ))}

              {/* Indicador de carregamento de documentos */}
              {loadingDocs && (
                <div style={{ ...styles.msgWrapper }}>
                  <span style={styles.agentAvatar}>⚡</span>
                  <div style={{ ...styles.bubble, ...styles.bubbleAgent, ...styles.bubbleTree }}>
                    <p style={{ ...styles.bubbleText, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Buscando documentos...
                    </p>
                  </div>
                </div>
              )}

              {/* Indicador de digitação do agente */}
              {loading && (
                <div style={styles.msgWrapper}>
                  <span style={styles.agentAvatar}>⚡</span>
                  <div style={{ ...styles.bubble, ...styles.bubbleAgent }} className="typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={styles.inputArea}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={inputPlaceholder}
                rows={1}
                disabled={inputDisabled}
                style={{ ...styles.textarea, opacity: inputDisabled ? 0.5 : 1 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || inputDisabled}
                className="btn btn-primary"
                style={styles.sendBtn}
              >
                Enviar →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de correção */}
      {correcting !== null && (
        <CorrectionModal
          message={messages[correcting]?.content || ''}
          onSave={() => { setSavedCorrections(s => new Set([...s, correcting])); setCorrecting(null) }}
          onCancel={() => setCorrecting(null)}
        />
      )}

      <style>{`
        .typing { display: flex; gap: 5px; align-items: center; padding: 14px 18px !important; }
        .typing span { width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: bounce 1.2s infinite; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>
    </div>
  )
}

// ─── Estilos: Layout ──────────────────────────────────────────────────────────
const styles = {
  layout:      { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar:     { width: 260, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarHeader: { padding: '16px', borderBottom: '1px solid var(--border)' },
  backBtn:     { background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 8, border: 'none' },
  sidebarTitle: { fontSize: 14, fontWeight: 600, margin: 0 },
  sessionList: { flex: 1, overflow: 'auto', padding: '8px' },
  sessionItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', cursor: 'pointer', textAlign: 'left', border: 'none', color: 'var(--text)', transition: 'background 0.15s' },
  sessionActive: { background: 'var(--primary-light)' },
  sessionIcon: { fontSize: 18, flexShrink: 0 },
  sessionInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  sessionName: { fontSize: 13, fontWeight: 500 },
  sessionDate: { fontSize: 11, color: 'var(--text-muted)' },
  emptyList:   { color: 'var(--text-muted)', fontSize: 13, padding: '12px', textAlign: 'center' },
  sidebarFooter: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border)' },
  avatar:      { width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  signOut:     { background: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', border: 'none' },

  chatArea:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  docBar:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  docBarTitle: { flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  docBarBtn:   { background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 },

  messages:    { flex: 1, overflow: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
  empty:       { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16, color: 'var(--text-muted)', textAlign: 'center' },

  msgWrapper:     { display: 'flex', gap: 10, alignItems: 'flex-start' },
  msgWrapperUser: { flexDirection: 'row-reverse', alignSelf: 'flex-end' },
  agentAvatar:    { width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },

  bubble:       { padding: '12px 16px', borderRadius: 16, maxWidth: '100%' },
  bubbleUser:   { background: 'var(--primary)', borderBottomRightRadius: 4, alignSelf: 'flex-end' },
  bubbleAgent:  { background: 'var(--bg-card)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 },
  bubbleTree:   { background: 'var(--bg)', border: '1px dashed var(--border)' },
  bubbleText:   { fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 },

  // Quick replies — árvore (cards com ícone)
  qrTreeGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 2 },
  qrTreeBtn:  {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', background: 'var(--bg-card)',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    color: 'var(--text)', transition: 'all 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },

  // Quick replies — chat (chips pequenos)
  qrChipRow: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 2 },
  qrChip:    {
    padding: '6px 14px', background: 'transparent',
    border: '1.5px solid var(--primary)', borderRadius: 20,
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    color: 'var(--primary)', transition: 'all 0.15s'
  },
  qrBadge: {
    fontSize: 11, background: 'var(--primary-light)',
    color: 'var(--primary)', borderRadius: 10,
    padding: '2px 7px', fontWeight: 500
  },

  inputArea: { display: 'flex', gap: 12, padding: '14px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 },
  textarea:  { flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '12px 14px', resize: 'none', lineHeight: 1.5, maxHeight: 120, fontFamily: 'inherit', fontSize: 14 },
  sendBtn:   { flexShrink: 0, alignSelf: 'flex-end' }
}

// ─── Estilos: Correção ────────────────────────────────────────────────────────
const corrStyles = {
  trainBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', textDecoration: 'underline', textDecorationStyle: 'dotted' },
  saved:    { fontSize: 12, color: '#27ae60', fontWeight: 500 },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:    { background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 14 },
  modalHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  modalDesc:   { fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 },
  fieldLabel:  { fontSize: 13, fontWeight: 600, color: '#333' },
  input:       { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  textarea:    { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 },
  footer:      { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  btnCancel:   { padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  btnSave:     { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }
}
