import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useMobile } from '../hooks/useMobile.js'

// ─── Componente: Item de sessão na sidebar (com rename + clear) ───────────────
function SessionItem({ session, isActive, onClick, onRename, onClear }) {
  const [renaming, setRenaming]       = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [showActions, setShowActions] = useState(false)
  const inputRef = useRef(null)

  const displayName = session.name || session.specialties?.name || 'Nova conversa'

  const startRename = (e) => {
    e.stopPropagation()
    setNameInput(session.name || '')
    setRenaming(true)
    setTimeout(() => inputRef.current?.select(), 40)
  }

  const saveRename = () => {
    setRenaming(false)
    const trimmed = nameInput.trim()
    if (trimmed !== (session.name || '')) onRename(trimmed)
  }

  const handleRenameKey = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); saveRename() }
    if (e.key === 'Escape') { setRenaming(false); setNameInput(session.name || '') }
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (window.confirm('Confirma a exclusão desta conversa?')) onClear()
  }

  return (
    <div
      style={{ ...sbStyles.item, ...(isActive ? sbStyles.itemActive : {}) }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={!renaming ? onClick : undefined}
    >
      <span style={sbStyles.icon}>{session.mode === 'support' ? '🔧' : '🎓'}</span>

      <div style={sbStyles.info}>
        {renaming ? (
          <input
            ref={inputRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={saveRename}
            onKeyDown={handleRenameKey}
            onClick={e => e.stopPropagation()}
            style={sbStyles.renameInput}
            placeholder="Nome da conversa"
            maxLength={60}
          />
        ) : (
          <span style={sbStyles.name} title={displayName}>{displayName}</span>
        )}
        <span style={sbStyles.date}>
          {new Date(session.created_at).toLocaleDateString('pt-BR')}
          {' '}
          {new Date(session.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
      </div>

      {(showActions || isActive) && !renaming && (
        <div style={sbStyles.actions} onClick={e => e.stopPropagation()}>
          <button style={sbStyles.actionBtn} onClick={startRename} title="Renomear">✏️</button>
          <button style={sbStyles.actionBtn} onClick={handleClear} title="Excluir conversa">🗑️</button>
        </div>
      )}
    </div>
  )
}

// ─── Constantes visuais ───────────────────────────────────────────────────────
const SPECIALTY_ICONS = { eas: '📡', cftv: '📷', 'controle-acesso': '🔐' }
const DOC_ICONS = { manual: '📘', technical_doc: '📋', procedure: '📋', bulletin: '📣', other: '📄' }
const CATEGORY_ICONS = {
  'Antena': '📡', 'Pedestal': '🚧', 'Antena/Pedestal': '📡',
  'Desativador': '🔓', 'Verificador': '🔍',
  'Etiqueta Rígida': '🏷️', 'Etiqueta': '🏷️',
  'Desacoplador': '🔌',
  'Câmera': '📷', 'DVR': '🖥️', 'NVR': '🖥️', 'DVR/NVR': '🖥️',
  'Leitor': '🔐', 'Controlador': '⚙️', 'Eletrofecho': '🔒',
  'Outros': '📦'
}

// ─── Utilitário: encontra fabricante na árvore por ID ─────────────────────────
function findManufacturerInTree(tree, manufacturerId) {
  for (const specialty of tree) {
    for (const tech of specialty.technologies || []) {
      for (const mfr of tech.manufacturers || []) {
        if (mfr.id === manufacturerId) return mfr
      }
    }
  }
  return null
}

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

// ─── Renderizador de páginas PDF via pdfjs-dist ───────────────────────────────
let pdfjsCache = null
async function getPdfjs() {
  if (pdfjsCache) return pdfjsCache
  const lib = await import('pdfjs-dist')
  // Worker via CDN — mesma versão do pacote instalado
  lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.mjs`
  pdfjsCache = lib
  return lib
}

function PdfPageRenderer({ documentId, pageNumber }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | error
  const cancelRef = useRef(false)

  useEffect(() => {
    cancelRef.current = false
    setImgSrc(null); setStatus('loading')
    ;(async () => {
      try {
        const { api } = await import('../services/api.js')
        const { url } = await api.getDocumentUrl(documentId)
        const pdfjs = await getPdfjs()
        const pdf = await pdfjs.getDocument(url).promise
        const pg = Math.min(pageNumber, pdf.numPages)
        const page = await pdf.getPage(pg)
        const vp = page.getViewport({ scale: 1.8 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width; canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        if (!cancelRef.current) { setImgSrc(canvas.toDataURL('image/jpeg', 0.88)); setStatus('ok') }
      } catch {
        if (!cancelRef.current) setStatus('error')
      }
    })()
    return () => { cancelRef.current = true }
  }, [documentId, pageNumber])

  if (status === 'loading') return (
    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(0,180,255,0.06)', color: '#7eb3cc', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Carregando página {pageNumber}…
    </div>
  )
  if (status === 'error' || !imgSrc) return null
  return (
    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,180,255,0.2)', maxWidth: 640 }}>
      <div style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.4)', fontSize: 11, color: '#7eb3cc' }}>
        📄 Página {pageNumber} do documento
      </div>
      <img src={imgSrc} style={{ width: '100%', display: 'block' }} alt={`Página ${pageNumber}`} />
    </div>
  )
}

// ─── Renderiza texto com [PAGINA:N] inline ────────────────────────────────────
function AgentContent({ text, documentId }) {
  if (!text) return null
  // Split on [PAGINA:N] tags
  const parts = text.split(/(\[PAGINA:\d+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/\[PAGINA:(\d+)\]/)
        if (m) {
          return documentId
            ? <PdfPageRenderer key={i} documentId={documentId} pageNumber={parseInt(m[1])} />
            : null
        }
        return part ? <MarkdownText key={i} text={part} /> : null
      })}
    </>
  )
}

// ─── Quick Replies iniciais ao selecionar um documento ───────────────────────
const QR_INICIAIS = [
  'Resumo geral do documento',
  'Procedimento de instalação',
  'Especificações técnicas',
  'Solução de problemas comuns'
]

// ─── Componente: Modal de Correção de Foto ───────────────────────────────────
function PhotoCorrectionModal({ agentResponse, onSave, onCancel }) {
  const [whatSaw, setWhatSaw]   = useState('')
  const [whatWrong, setWhatWrong] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!whatSaw.trim()) return
    setSaving(true)
    try {
      await api.submitCorrection({
        question: `[CORREÇÃO DE FOTO] Análise visual incorreta. Resposta do agente: ${agentResponse?.substring(0, 200)}`,
        correct_response: `O que estava na foto: ${whatSaw.trim()}${whatWrong ? '\nO que estava errado: ' + whatWrong.trim() : ''}`,
        type: 'photo_correction'
      })
      onSave()
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={corrStyles.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...corrStyles.modal, maxWidth: 440 }}>
        <div style={corrStyles.modalHeader}>
          <span style={{ fontSize: 22 }}>📷</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Corrigir Análise Visual</h3>
            <p style={{ ...corrStyles.modalDesc, marginTop: 2 }}>Ajude a melhorar o reconhecimento de imagens do agente</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={corrStyles.fieldLabel}>O que você vê na foto? *</label>
            <textarea value={whatSaw} onChange={e => setWhatSaw(e.target.value)}
              placeholder="Ex: Antena Sensormatic Ultra 1.8, placa principal, jumper J5 no canto superior direito..."
              rows={3} style={{ ...corrStyles.textarea, marginTop: 6 }} />
          </div>
          <div>
            <label style={corrStyles.fieldLabel}>O que o agente errou no diagnóstico? (opcional)</label>
            <textarea value={whatWrong} onChange={e => setWhatWrong(e.target.value)}
              placeholder="Ex: Identificou o modelo errado, indicou foto de referência irrelevante, diagnóstico incorreto..."
              rows={2} style={{ ...corrStyles.textarea, marginTop: 6 }} />
          </div>
        </div>
        <div style={corrStyles.footer}>
          <button onClick={onCancel} style={corrStyles.btnCancel}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !whatSaw.trim()} style={{ ...corrStyles.btnSave, background: '#e67e22' }}>
            {saving ? 'Salvando...' : '📷 Enviar Correção'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
function MessageBubble({ msg, isLast, canTrain, onQuickReply, onCorrect, correctionSaved, documentId }) {
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
            : <div style={styles.bubbleText}><AgentContent text={msg.content} documentId={documentId} /></div>
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
              <button onClick={onCorrect} style={{ ...corrStyles.trainBtn, color: msg.isPhotoAnalysis ? '#e67e22' : '#888' }}>
                {msg.isPhotoAnalysis ? '📷 Corrigir foto' : '✏ Corrigir'}
              </button>
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
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const isMobile = useMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fecha sidebar mobile ao trocar de sessão
  useEffect(() => { setSidebarOpen(false) }, [sessionId])

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
  const [sessionsLoaded, setSessionsLoaded] = useState(false)

  // Fabricante para a sessão atual:
  // ref = valor atual (atualizado de forma síncrona dentro do efeito)
  // ready = gatilho reativo (boolean) para re-renderizar quando o fabricante for resolvido
  const mfgContextRef = useRef(null)
  const [mfgContextReady, setMfgContextReady] = useState(false)

  // Correções texto
  const [correcting, setCorrecting] = useState(null)
  const [savedCorrections, setSavedCorrections] = useState(new Set())
  // Correção foto
  const [correctingPhoto, setCorrectingPhoto] = useState(null) // { content, index }

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const treeStartedRef = useRef(false)
  const enviarMensagemRef = useRef(null)  // always-current ref — avoids stale closure in handleQuickReply

  const canTrain = profile?.permissions?.train_agent || profile?.role === 'admin'

  // ── Voz (Web Speech API) ──────────────────────────────────────────────────
  const [listening, setListening] = useState(false)
  const recognitionRef    = useRef(null)
  const voiceTranscriptRef = useRef('')   // guarda transcrição final para auto-envio

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Reconhecimento de voz não suportado neste navegador.'); return }
    if (listening) { recognitionRef.current?.stop(); return }
    const rec = new SR()
    rec.lang = 'pt-BR'
    rec.interimResults = true
    rec.continuous = false
    rec.onstart  = () => { setListening(true); voiceTranscriptRef.current = '' }
    rec.onerror  = () => { setListening(false) }
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
      voiceTranscriptRef.current = transcript
      setInput(transcript)
    }
    rec.onend = () => {
      setListening(false)
      const finalText = voiceTranscriptRef.current.trim()
      voiceTranscriptRef.current = ''
      // Auto-envia ao terminar a fala (se houver texto e documento selecionado)
      if (finalText) {
        setInput('')
        enviarMensagemRef.current?.(finalText)
      }
    }
    recognitionRef.current = rec
    rec.start()
  }, [listening])

  // ── Foto (câmera / galeria) ───────────────────────────────────────────────
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false)
  const photoInputRef = useRef(null)

  const handlePhotoSend = useCallback(async (file) => {
    if (!file || !sessionId) return
    setAnalyzingPhoto(true)
    const userMsg = { role: 'user', content: `📷 Foto enviada${input ? ': ' + input : ''}`, created_at: new Date() }
    setMessages(m => [...m, userMsg])
    setInput('')
    try {
      const result = await api.analyzePhoto(file, {
        sessionId,
        message: input || '',
        manufacturerId: selectedDoc?.manufacturerId || '',
        modelId: selectedDoc?.modelId || '',
        specialtyId: selectedDoc?.specialtyId || ''
      })
      setMessages(m => [...m, {
        role: 'assistant',
        content: result.response,
        quickReplies: [],
        isPhotoAnalysis: true,
        created_at: new Date()
      }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `Erro ao analisar foto: ${err.message}`, created_at: new Date() }])
    } finally {
      setAnalyzingPhoto(false)
    }
  }, [sessionId, input, selectedDoc])

  // ── Renomear sessão ───────────────────────────────────────────────────────
  const handleRename = useCallback(async (id, name) => {
    try {
      await api.renameSession(id, name)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, name: name || null } : s))
    } catch { /* silencia — o usuário pode tentar de novo */ }
  }, [])

  // ── Excluir sessão completamente ──────────────────────────────────────────
  const handleClear = useCallback(async (id) => {
    try {
      await api.deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (id === sessionId) navigate('/')
    } catch (err) {
      alert('Erro ao excluir conversa: ' + err.message)
    }
  }, [sessionId, navigate])

  // ── Carrega lista de sessões (recarrega quando sessionId muda para incluir novas sessões) ───
  useEffect(() => {
    api.getSessions().then(r => { setSessions(r.sessions || []); setSessionsLoaded(true) })
  }, [sessionId])

  // ── Carrega árvore de conhecimento ────────────────────────────────────────
  useEffect(() => {
    api.getTree().then(r => { setTree(r.tree || []); setTreeReady(true) })
  }, [])

  // ── Muda de sessão ────────────────────────────────────────────────────────
  useEffect(() => {
    // Resolve o fabricante para esta sessão a partir do nav state
    if (location.state !== null && location.state !== undefined) {
      mfgContextRef.current = location.state.manufacturer || null  // vem do Dashboard
      setMfgContextReady(true)
    } else {
      mfgContextRef.current = null
      setMfgContextReady(false)  // aguarda fallback via sessions + tree
    }

    if (!sessionId) { setMessages([]); setSelectedDoc(null); treeStartedRef.current = false; return }
    // Reset síncrono: garante que messages = [] ANTES de getHistory retornar
    // Evita race: se tree init disparar antes do getHistory (sessão anterior também vazia),
    // o resultado vazio do history não deve apagar a árvore que já foi montada
    setMessages([])
    setSelectedDoc(null)
    treeStartedRef.current = false

    api.getHistory(sessionId).then(r => {
      const hist = r.messages || []
      if (hist.length > 0) {
        // Sessão com histórico: mostra mensagens + permite trocar documento
        setMessages(hist.map(m => ({ ...m, isTree: false })))
        setSelectedDoc({ id: '__history__', title: 'Sessão anterior', type: 'other' })
      }
      // history vazio: não faz nada — messages já foi limpo de forma síncrona acima
    })
  }, [sessionId])

  // ── Fallback: resolve fabricante a partir das sessões (quando não vem do Dashboard) ─
  useEffect(() => {
    if (mfgContextReady) return  // já resolvido
    if (!sessionsLoaded || !tree.length || !sessionId) return
    const sess = sessions.find(s => s.id === sessionId)
    if (sess?.manufacturer_id) {
      const mfr = findManufacturerInTree(tree, sess.manufacturer_id)
      mfgContextRef.current = mfr || null
    } else {
      mfgContextRef.current = null  // sessão sem fabricante → árvore completa
    }
    setMfgContextReady(true)
  }, [mfgContextReady, sessionsLoaded, sessions, sessionId, tree])

  // ── Inicia árvore quando sessão nova + árvore pronta ─────────────────────
  useEffect(() => {
    if (
      sessionId &&
      treeReady &&
      tree.length > 0 &&
      messages.length === 0 &&
      !selectedDoc &&
      !treeStartedRef.current &&
      mfgContextReady   // aguarda resolução do fabricante
    ) {
      treeStartedRef.current = true
      iniciarArvore(mfgContextRef.current)
    }
  }, [sessionId, treeReady, tree, messages.length, selectedDoc, mfgContextReady])

  // ── Scroll automático ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Árvore de categorias (quando vem do Dashboard com fabricante) ──────────
  const iniciarArvoreCategorias = useCallback((manufacturer) => {
    const models = manufacturer.equipment_models || []

    if (!models.length) {
      // Sem modelos cadastrados — tenta mostrar documentos do fabricante diretamente
      buscarDocumentos({ manufacturerId: manufacturer.id }, null)
      return
    }

    // Agrupa modelos por categoria
    const grouped = {}
    models.forEach(m => {
      const cat = m.category || 'Outros'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(m)
    })
    const categories = Object.keys(grouped)

    // Se todos sem categoria OU só uma categoria → vai direto para modelos
    const realCats = categories.filter(c => c !== 'Outros')
    if (realCats.length === 0) {
      setMessages([{
        role: 'assistant', isTree: true, created_at: new Date(),
        content: `Qual modelo da **${manufacturer.name}** você precisa consultar?`,
        quickReplies: models.map(m => ({
          label: m.name + (m.model_code ? ` (${m.model_code})` : ''),
          treeAction: { step: 'category_model', item: m }
        }))
      }])
      return
    }

    // Múltiplas categorias → mostra seleção de tipo
    setMessages([{
      role: 'assistant', isTree: true, created_at: new Date(),
      content: `Qual tipo de equipamento **${manufacturer.name}** você vai consultar?`,
      quickReplies: categories.map(cat => ({
        label: cat,
        icon: CATEGORY_ICONS[cat] || '📦',
        treeAction: { step: 'category', item: { name: cat, models: grouped[cat], manufacturer } }
      }))
    }])
  }, [])

  // ── Monta primeira mensagem da árvore ─────────────────────────────────────
  const iniciarArvore = useCallback((mfr) => {
    if (mfr) {
      iniciarArvoreCategorias(mfr)
      return
    }
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
  }, [tree, iniciarArvoreCategorias])

  // ── Avança na árvore de decisão ───────────────────────────────────────────
  const avancarArvore = useCallback(async (step, item) => {
    const msgUser = { role: 'user', content: item.name || item.title, isTree: true, created_at: new Date() }

    // ── Novos passos: árvore de categorias ───────────────────────────────────
    if (step === 'category') {
      const { name: catName, models } = item
      if (models.length === 1) {
        await buscarDocumentos({ modelId: models[0].id }, msgUser)
      } else {
        setMessages(m => [...m, msgUser, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: `Qual modelo de **${catName}** você precisa?`,
          quickReplies: models.map(mdl => ({
            label: mdl.name + (mdl.model_code ? ` (${mdl.model_code})` : ''),
            treeAction: { step: 'category_model', item: mdl }
          }))
        }])
      }
      return

    } else if (step === 'category_model') {
      await buscarDocumentos({ modelId: item.id }, msgUser)
      return
    }

    // ── Árvore completa (sem contexto de fabricante) ──────────────────────────
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
    setMessages(m => [...m, ...(msgUser ? [msgUser] : [])])
    setLoadingDocs(true)
    try {
      const { documents: docs } = await api.getDocuments(filters)
      if (!docs?.length) {
        setMessages(m => [...m, {
          role: 'assistant', isTree: true, created_at: new Date(),
          content: '⚠️ Nenhum documento cadastrado para este item.\n\nConsulte o administrador para adicionar o material correspondente.',
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
    } catch (err) {
      setMessages(m => [...m, {
        role: 'assistant', isTree: true, created_at: new Date(),
        content: `Erro ao buscar documentos: ${err?.message || 'Tente novamente.'}`,
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
    setSelectedDoc({ id: doc.id, title: doc.title, type: doc.type, fileUrl: doc.file_url })
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Handler de quick reply clicado ────────────────────────────────────────
  const handleQuickReply = useCallback(async (qr) => {
    if (qr.treeAction) {
      if (qr.treeAction.step === 'restart') {
        setSelectedDoc(null)
        treeStartedRef.current = true
        setMessages([])
        setTimeout(() => {
          if (mfgContextRef.current) {
            iniciarArvoreCategorias(mfgContextRef.current)
          } else {
            setMessages([{
              role: 'assistant', isTree: true, created_at: new Date(),
              content: 'Qual é a especialidade?',
              quickReplies: tree.map(s => ({
                label: s.name, icon: SPECIALTY_ICONS[s.slug] || '📋',
                treeAction: { step: 'specialty', item: s }
              }))
            }])
          }
        }, 0)
        return
      }
      await avancarArvore(qr.treeAction.step, qr.treeAction.item)
    } else {
      // Quick reply real → envia como mensagem do usuário
      await enviarMensagemRef.current?.(qr.label)
    }
  }, [tree, avancarArvore, iniciarArvoreCategorias])

  // ── Envio de mensagem ao agente ───────────────────────────────────────────
  const enviarMensagem = async (texto) => {
    const msg = (texto || input).trim()
    if (!msg || !sessionId || loading || !selectedDoc || selectedDoc.id === '__history__') return
    setInput('')

    // Contexto: documento específico (árvore completa) ou modelo (árvore de categorias)
    const msgContext = selectedDoc.type === 'model'
      ? { equipmentModelId: selectedDoc.modelId }
      : { documentId: selectedDoc.id }

    setMessages(m => [...m, { role: 'user', content: msg, created_at: new Date() }])
    setLoading(true)
    try {
      const result = await api.sendMessage({
        sessionId,
        message: msg,
        context: msgContext
      })
      const hasOptions = Array.isArray(result.options) && result.options.length > 0
      setMessages(m => [...m, {
        role: 'assistant',
        content: result.response,
        isTree: hasOptions,  // usa estilo árvore quando há opções clicáveis
        quickReplies: hasOptions
          ? result.options.map(label => ({ label }))  // opções viram botões — sem treeAction, click envia como msg
          : (result.quickReplies || []).map(label => ({ label })),
        created_at: new Date()
      }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `Erro: ${err.message}`, created_at: new Date() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  enviarMensagemRef.current = enviarMensagem  // keep ref current every render

  const send = () => enviarMensagem(input.trim())
  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  // ── Índice da última mensagem com quick replies ───────────────────────────
  const lastQRIdx = messages.reduce((acc, m, i) => m.quickReplies?.length ? i : acc, -1)

  // ── Trocar documento / modelo ─────────────────────────────────────────────
  const trocarDocumento = () => {
    setSelectedDoc(null)
    treeStartedRef.current = true
    if (mfgContextRef.current) {
      // Reinicia árvore de categorias (contexto do Dashboard)
      setMessages(prev => prev.filter(m => !m.isTree))
      iniciarArvoreCategorias(mfgContextRef.current)
    } else {
      // Reinicia árvore completa de especialidades
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
  }

  // ── Placeholder do input ──────────────────────────────────────────────────
  const inputPlaceholder = !selectedDoc
    ? 'Selecione o equipamento na árvore acima...'
    : selectedDoc.id === '__history__'
    ? 'Clique em "Trocar equipamento" para fazer novas perguntas'
    : selectedDoc.type === 'model'
    ? `Pergunta sobre ${selectedDoc.title}... (Enter para enviar)`
    : `Pergunta sobre "${selectedDoc.title}"... (Enter para enviar)`

  const inputDisabled = !selectedDoc || selectedDoc.id === '__history__' || loading

  // ── Sidebar compartilhada (desktop fixa / mobile drawer) ─────────────────
  const SidebarEl = (
    <aside style={{
      ...styles.sidebar,
      ...(isMobile ? { position: 'fixed', top: 0, left: sidebarOpen ? 0 : -280, height: '100%', zIndex: 300, width: 280, transition: 'left 0.25s ease', boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.4)' : 'none' } : {})
    }}>
      <div style={styles.sidebarHeader}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, marginRight: 8, cursor: 'pointer' }}>✕</button>
        )}
        <button onClick={() => { navigate('/'); setSidebarOpen(false) }} style={styles.backBtn}>← Voltar</button>
        <h2 style={styles.sidebarTitle}>Conversas</h2>
      </div>
      <div style={styles.sessionList}>
        {sessions.map(s => (
          <SessionItem
            key={s.id}
            session={s}
            isActive={s.id === sessionId}
            onClick={() => { navigate(`/chat/${s.id}`); setSidebarOpen(false) }}
            onRename={(name) => handleRename(s.id, name)}
            onClear={() => handleClear(s.id)}
          />
        ))}
        {sessions.length === 0 && <p style={styles.emptyList}>Nenhuma conversa ainda</p>}
      </div>
      <div style={styles.sidebarFooter}>
        <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
        <span style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
        <button onClick={signOut} style={styles.signOut}>Sair</button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      {/* Sidebar desktop */}
      {!isMobile && SidebarEl}

      {/* Mobile: overlay + drawer */}
      {isMobile && sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 299 }} onClick={() => setSidebarOpen(false)} />
      )}
      {isMobile && SidebarEl}

      {/* ── Área de chat ────────────────────────────────────────────────── */}
      <div style={styles.chatArea}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}>☰</button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>⚡ EAS Expert</span>
            {selectedDoc && (
              <button style={{ ...styles.docBarBtn, fontSize: 11 }} onClick={trocarDocumento}>Trocar</button>
            )}
          </div>
        )}

        {!sessionId ? (
          <div style={styles.empty}>
            <span style={{ fontSize: 48 }}>💬</span>
            <p>Inicie uma nova conversa pelo Dashboard</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Ir para Dashboard</button>
          </div>
        ) : (
          <>
            {/* Barra do documento selecionado — desktop only */}
            {selectedDoc && !isMobile && (
              <div style={styles.docBar}>
                <span>{selectedDoc.type === 'model' ? '⚙️' : (DOC_ICONS[selectedDoc.type] || '📄')}</span>
                <span style={styles.docBarTitle}>{selectedDoc.title}</span>
                {selectedDoc.type === 'model' && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>• RAG ativo</span>
                )}
                <button style={styles.docBarBtn} onClick={trocarDocumento}>
                  {selectedDoc.type === 'model' ? 'Trocar equipamento' : 'Trocar documento'}
                </button>
              </div>
            )}
            {/* Mobile doc name strip */}
            {selectedDoc && isMobile && (
              <div style={{ padding: '6px 12px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {DOC_ICONS[selectedDoc.type] || '📄'} {selectedDoc.title}
              </div>
            )}

            {/* Mensagens — bloqueio de cópia + marca d'água */}
            <div
              style={{ ...styles.messages, padding: isMobile ? '12px' : '24px 28px', position: 'relative', userSelect: 'none' }}
              onCopy={e => e.preventDefault()}
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
            >
              {/* Marca d'água */}
              <div style={wmStyles.container} aria-hidden="true">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} style={{ ...wmStyles.text, top: `${(i * 11) % 95}%`, left: `${(i * 17) % 85}%` }}>
                    {user?.email} • SENSORSEG CONFIDENCIAL
                  </div>
                ))}
              </div>
              {/* Conteúdo */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  isLast={i === lastQRIdx}
                  canTrain={canTrain}
                  onQuickReply={handleQuickReply}
                  onCorrect={() => m.isPhotoAnalysis ? setCorrectingPhoto({ content: m.content, index: i }) : setCorrecting(i)}
                  correctionSaved={savedCorrections.has(i)}
                  documentId={selectedDoc?.id}
                />
              ))}

              {loadingDocs && (
                <div style={{ ...styles.msgWrapper }}>
                  <span style={styles.agentAvatar}>⚡</span>
                  <div style={{ ...styles.bubble, ...styles.bubbleAgent, ...styles.bubbleTree }}>
                    <p style={{ ...styles.bubbleText, color: 'var(--text-muted)', fontStyle: 'italic' }}>Buscando documentos...</p>
                  </div>
                </div>
              )}

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
            </div>

            {/* Input */}
            <div style={{ ...styles.inputArea, padding: isMobile ? '8px 10px' : '14px 28px', gap: isMobile ? 6 : 12, alignItems: 'flex-end' }}>
              {/* Câmera / foto */}
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) { handlePhotoSend(f); e.target.value = '' } }} />
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={analyzingPhoto || !sessionId}
                title="Enviar foto para análise"
                style={{ ...iconBtnStyle, color: analyzingPhoto ? 'var(--primary)' : 'var(--text-muted)', fontSize: isMobile ? 22 : 20 }}
              >
                {analyzingPhoto ? '⏳' : '📷'}
              </button>

              {/* Voz */}
              <button
                onClick={startVoice}
                title={listening ? 'Parar gravação' : 'Entrada por voz'}
                style={{ ...iconBtnStyle, color: listening ? '#ef4444' : 'var(--text-muted)', fontSize: isMobile ? 22 : 20, animation: listening ? 'pulse 1s infinite' : 'none' }}
              >
                🎤
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isMobile
                  ? (!selectedDoc ? 'Selecione o equipamento...' : selectedDoc.id === '__history__' ? 'Trocar equipamento →' : listening ? '🎤 Ouvindo...' : 'Digite ou use voz/foto...')
                  : (listening ? '🎤 Ouvindo... fale sua pergunta' : inputPlaceholder)}
                rows={isMobile ? 2 : 1}
                disabled={inputDisabled && !analyzingPhoto}
                style={{ ...styles.textarea, opacity: (inputDisabled && !analyzingPhoto) ? 0.5 : 1, fontSize: 16, border: listening ? '1.5px solid #ef4444' : undefined }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || inputDisabled}
                className="btn btn-primary"
                style={{ ...styles.sendBtn, padding: isMobile ? '12px 14px' : '10px 20px', fontSize: isMobile ? 18 : 14 }}
              >
                {isMobile ? '➤' : 'Enviar →'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de correção de texto */}
      {correcting !== null && (
        <CorrectionModal
          message={messages[correcting]?.content || ''}
          onSave={() => { setSavedCorrections(s => new Set([...s, correcting])); setCorrecting(null) }}
          onCancel={() => setCorrecting(null)}
        />
      )}

      {/* Modal de correção de foto */}
      {correctingPhoto !== null && (
        <PhotoCorrectionModal
          agentResponse={correctingPhoto.content}
          onSave={() => { setSavedCorrections(s => new Set([...s, correctingPhoto.index])); setCorrectingPhoto(null) }}
          onCancel={() => setCorrectingPhoto(null)}
        />
      )}

      <style>{`
        .typing { display: flex; gap: 5px; align-items: center; padding: 14px 18px !important; }
        .typing span { width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: bounce 1.2s infinite; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

// ─── Estilo botão ícone (voz / câmera) ───────────────────────────────────────
const iconBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '6px', borderRadius: 8, lineHeight: 1, flexShrink: 0,
  transition: 'opacity 0.2s', minHeight: 44, minWidth: 36,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}

// ─── Estilos: Layout ──────────────────────────────────────────────────────────
const styles = {
  layout:      { display: 'flex', height: '100dvh', overflow: 'hidden' },
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
    padding: '12px 16px', background: 'var(--bg-card)',
    border: '2px solid var(--border)', borderRadius: 10,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    color: 'var(--text)', transition: 'all 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', minHeight: 48
  },

  // Quick replies — chat (chips pequenos)
  qrChipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 2 },
  qrChip:    {
    padding: '10px 16px', background: 'transparent',
    border: '1.5px solid var(--primary)', borderRadius: 20,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    color: 'var(--primary)', transition: 'all 0.15s', minHeight: 44
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

// ─── Estilos: Sidebar SessionItem ────────────────────────────────────────────
const sbStyles = {
  item:          { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', color: 'var(--text)', transition: 'background 0.15s', position: 'relative' },
  itemActive:    { background: 'var(--primary-light)' },
  icon:          { fontSize: 16, flexShrink: 0 },
  info:          { flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' },
  name:          { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date:          { fontSize: 11, color: 'var(--text-muted)' },
  renameInput:   { width: '100%', background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 5, color: 'var(--text)', fontSize: 12, padding: '2px 6px', outline: 'none' },
  actions:       { display: 'flex', gap: 2, flexShrink: 0 },
  actionBtn:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: 4, opacity: 0.7, lineHeight: 1 },
  actionBtnWarn: { background: 'rgba(231,76,60,0.15)', opacity: 1, fontWeight: 700, fontSize: 11, color: '#e74c3c' }
}

// ─── Estilos: Marca d'água ─────────────────────────────────────────────────
const wmStyles = {
  container: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 },
  text:      { position: 'absolute', transform: 'rotate(-35deg)', opacity: 0.045, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--text)', userSelect: 'none', letterSpacing: '0.04em' }
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
