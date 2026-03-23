import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const PERMISSIONS = [
  { key: 'train_agent',      label: 'Treinar Agente',         desc: 'Corrigir e treinar respostas do agente' },
  { key: 'chat_support',     label: 'Chat de Suporte',        desc: 'Atendimento via chat técnico' },
  { key: 'chat_training',    label: 'Modo Treinamento',       desc: 'Acesso ao chat de treinamento' },
  { key: 'field_issues',     label: 'Problemas de Campo',     desc: 'Registrar e consultar problemas de campo' },
  { key: 'knowledge_read',   label: 'Base de Conhecimento',   desc: 'Consultar documentos técnicos' },
  { key: 'knowledge_upload', label: 'Upload de Documentos',   desc: 'Enviar documentos para a base' },
  { key: 'admin_panel',      label: 'Painel Administrativo',  desc: 'Acesso ao painel de administração' },
]

const ROLE_DEFAULTS = {
  admin:      { train_agent: true,  chat_support: true,  chat_training: true, field_issues: true,  knowledge_read: true, knowledge_upload: true,  admin_panel: true  },
  manager:    { train_agent: true,  chat_support: true,  chat_training: true, field_issues: true,  knowledge_read: true, knowledge_upload: true,  admin_panel: false },
  technician: { train_agent: false, chat_support: true,  chat_training: true, field_issues: true,  knowledge_read: true, knowledge_upload: false, admin_panel: false },
  trainee:    { train_agent: false, chat_support: false, chat_training: true, field_issues: false, knowledge_read: true, knowledge_upload: false, admin_panel: false },
}

const ROLE_LABELS = { admin: 'Administrador', manager: 'Gestor', technician: 'Técnico', trainee: 'Trainee' }

const DOC_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'technical_doc', label: 'Doc. Técnico' },
  { value: 'procedure', label: 'Procedimento' },
  { value: 'bulletin', label: 'Boletim' },
  { value: 'other', label: 'Outro' }
]
const TYPE_COLORS = { manual: 'badge-blue', technical_doc: 'badge-green', procedure: 'badge-yellow', bulletin: 'badge-blue', other: 'badge-green' }

// ─────────────────────────────────────────────────────────────
// CREATE USER MODAL
// ─────────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'technician' })
  const [permissions, setPermissions] = useState({ ...ROLE_DEFAULTS.technician })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleRoleChange = (role) => {
    setForm(f => ({ ...f, role }))
    setPermissions({ ...ROLE_DEFAULTS[role] })
  }

  const togglePerm = (key) => setPermissions(p => ({ ...p, [key]: !p[key] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Email e senha são obrigatórios'); return }
    if (form.password.length < 6) { setError('Senha deve ter mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    try {
      const result = await api.createUser({ ...form, permissions })
      onSuccess(result)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={M.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...M.box, maxWidth: 520 }}>
        <div style={M.header}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo Usuário</h2>
          <button onClick={onClose} style={M.close}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ ...M.body, gap: 16 }}>
          {/* Dados básicos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={M.label}>Nome completo</label>
              <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nome do usuário" style={M.input} />
            </div>
            <div>
              <label style={M.label}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" style={M.input} required />
            </div>
            <div>
              <label style={M.label}>Senha *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" style={{ ...M.input, paddingRight: 36 }} required />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</button>
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label style={M.label}>Perfil de acesso</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <button key={key} type="button" onClick={() => handleRoleChange(key)}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${form.role === key ? 'var(--primary)' : 'var(--border)'}`, background: form.role === key ? 'var(--primary-light)' : 'transparent', color: form.role === key ? 'var(--primary)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissões */}
          <div>
            <label style={{ ...M.label, marginBottom: 10 }}>Permissões</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERMISSIONS.map(p => (
                <label key={p.key} onClick={() => togglePerm(p.key)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${permissions[p.key] ? 'var(--primary)' : 'var(--border)'}`, background: permissions[p.key] ? 'var(--primary-light)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${permissions[p.key] ? 'var(--primary)' : 'var(--text-muted)'}`, background: permissions[p.key] ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {permissions[p.key] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: permissions[p.key] ? 'var(--primary)' : 'var(--text)' }}>{p.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Criando...' : '+ Criar Usuário'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// UPLOAD MODAL
// ─────────────────────────────────────────────────────────────
function UploadModal({ tree, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'manual', specialtyId: '', technologyId: '', manufacturerId: '' })
  const [modelName, setModelName] = useState('')          // texto livre do modelo
  const [modelCategory, setModelCategory] = useState('')  // categoria do modelo (quando criando novo)
  const [technologies, setTechnologies] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])               // sugestões para autocomplete
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (form.specialtyId) {
      const s = tree.find(x => x.id === form.specialtyId)
      setTechnologies(s?.technologies || [])
      setForm(f => ({ ...f, technologyId: '', manufacturerId: '' }))
      setManufacturers([]); setModels([]); setModelName('')
    }
  }, [form.specialtyId])
  useEffect(() => {
    if (form.technologyId) {
      const t = technologies.find(x => x.id === form.technologyId)
      setManufacturers(t?.manufacturers || [])
      setForm(f => ({ ...f, manufacturerId: '' }))
      setModels([]); setModelName(''); setModelCategory('')
    }
  }, [form.technologyId])
  useEffect(() => {
    if (form.manufacturerId) {
      const m = manufacturers.find(x => x.id === form.manufacturerId)
      setModels(m?.equipment_models || [])
      setModelName(''); setModelCategory('')
    }
  }, [form.manufacturerId])

  const handleFile = (f) => {
    if (!f) return
    const ok = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!ok.includes(f.type)) { setError('Use PDF, DOCX ou TXT'); return }
    setFile(f); setError('')
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Selecione um arquivo'); return }
    if (!form.title) { setError('Título obrigatório'); return }
    setLoading(true); setError('')
    try {
      // Resolve o modelo: busca existente (case-insensitive) ou cria novo
      let equipmentModelId = null
      const trimmedModel = modelName.trim()
      if (trimmedModel && form.manufacturerId) {
        const existing = models.find(
          m => m.name.toLowerCase() === trimmedModel.toLowerCase() ||
               m.model_code?.toLowerCase() === trimmedModel.toLowerCase()
        )
        if (existing) {
          equipmentModelId = existing.id
        } else {
          // Cria o modelo automaticamente e usa o ID retornado
          const { model } = await api.addModel({ name: trimmedModel, manufacturerId: form.manufacturerId, category: modelCategory.trim() || null })
          equipmentModelId = model.id
        }
      }

      const result = await api.uploadDocument(file, {
        title: form.title,
        type: form.type,
        specialtyId: form.specialtyId || null,
        technologyId: form.technologyId || null,
        manufacturerId: form.manufacturerId || null,
        equipmentModelId
      })
      onSuccess(result.document)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={M.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={M.box}>
        <div style={M.header}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Upload de Documento</h2>
          <button onClick={onClose} style={M.close}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={M.body}>
          <div style={{ ...M.drop, ...(drag ? M.dropDrag : {}), ...(file ? M.dropOk : {}) }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={e => handleFile(e.target.files[0])} />
            {file ? (<><span style={{ fontSize: 32 }}>📄</span><p style={{ fontWeight: 600 }}>{file.name}</p><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(file.size / 1024).toFixed(0)} KB</p></>)
              : (<><span style={{ fontSize: 32 }}>⬆️</span><p style={{ fontWeight: 500 }}>Clique ou arraste o arquivo</p><p style={{ color: 'var(--text-muted)', fontSize: 12 }}>PDF, DOCX ou TXT • Máx. 50 MB</p></>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={M.label}>Título *</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={M.input} required /></div>
            <div><label style={M.label}>Tipo</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={M.select}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categorização</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={M.label}>Especialidade</label>
              <select value={form.specialtyId} onChange={e => setForm(p => ({ ...p, specialtyId: e.target.value }))} style={M.select}>
                <option value="">Geral</option>
                {tree.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label style={M.label}>Tecnologia</label>
              <select value={form.technologyId} onChange={e => setForm(p => ({ ...p, technologyId: e.target.value }))} style={M.select} disabled={!technologies.length}>
                <option value="">Geral</option>
                {technologies.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><label style={M.label}>Fabricante</label>
              <select value={form.manufacturerId} onChange={e => setForm(p => ({ ...p, manufacturerId: e.target.value }))} style={M.select} disabled={!manufacturers.length}>
                <option value="">Todos</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={M.label}>
                Modelo
                {modelName.trim() && !models.find(m => m.name.toLowerCase() === modelName.trim().toLowerCase()) && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>✦ será criado</span>
                )}
              </label>
              <input
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                list="model-datalist"
                placeholder={form.manufacturerId ? 'Digite o modelo...' : 'Selecione o fabricante primeiro'}
                disabled={!form.manufacturerId}
                style={{ ...M.input, opacity: form.manufacturerId ? 1 : 0.5 }}
              />
              <datalist id="model-datalist">
                {models.map(m => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
            {/* Categoria — só exibida quando criando novo modelo */}
            {modelName.trim() && !models.find(m => m.name.toLowerCase() === modelName.trim().toLowerCase()) && (
              <div>
                <label style={M.label}>
                  Categoria do equipamento
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  value={modelCategory}
                  onChange={e => setModelCategory(e.target.value)}
                  list="category-datalist"
                  placeholder="Ex: Antena/Pedestal, Desativador, Verificador..."
                  style={M.input}
                />
                <datalist id="category-datalist">
                  {['Antena/Pedestal','Desativador','Verificador','Etiqueta Rígida','Desacoplador','Câmera','DVR/NVR','Leitor','Controlador','Eletrofecho','Outros']
                    .map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            )}
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Enviando...' : '⬆️ Enviar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADMIN PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState('requests')
  const [tree, setTree] = useState([])
  const [requests, setRequests] = useState([])
  const [authorizedEmails, setAuthorizedEmails] = useState([])
  const [users, setUsers] = useState([])
  const [documents, setDocuments] = useState([])
  const [issues, setIssues] = useState([])
  const [dashData, setDashData] = useState({})
  const [docFilters, setDocFilters] = useState({ specialtyId: '', technologyId: '', manufacturerId: '' })
  const [showUpload, setShowUpload] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newEmail, setNewEmail] = useState({ email: '', name: '' })
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    api.getTree().then(r => setTree(r.tree || []))
    api.getDashboard().then(setDashData).catch(() => {})
    api.getDocuments().then(r => setDocuments(r.documents || [])).catch(() => {})
    api.getUsers().then(r => setUsers(r.users || [])).catch(() => {})
    api.getFieldIssues().then(r => setIssues(r.issues || [])).catch(() => {})
    fetchRequests()
    fetchAuthorizedEmails()
  }, [])

  useEffect(() => {
    const p = {}
    if (docFilters.specialtyId) p.specialtyId = docFilters.specialtyId
    if (docFilters.technologyId) p.technologyId = docFilters.technologyId
    if (docFilters.manufacturerId) p.manufacturerId = docFilters.manufacturerId
    api.getDocuments(p).then(r => setDocuments(r.documents || [])).catch(() => {})
  }, [docFilters])

  const fetchRequests = () => api.getAccessRequests().then(r => setRequests(r.requests || [])).catch(() => {})
  const fetchAuthorizedEmails = () => api.getAuthorizedEmails().then(r => setAuthorizedEmails(r.emails || [])).catch(() => {})

  const approveRequest = async (id) => {
    await api.reviewAccessRequest(id, 'approved')
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'approved' } : x))
  }
  const rejectRequest = async (id) => {
    await api.reviewAccessRequest(id, 'rejected')
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'rejected' } : x))
  }
  const deleteRequest = async (id) => {
    await api.deleteAccessRequest(id)
    setRequests(r => r.filter(x => x.id !== id))
  }

  const addAuthorizedEmail = async (e) => {
    e.preventDefault()
    setEmailLoading(true)
    try {
      const { email: added } = await api.addAuthorizedEmail(newEmail)
      setAuthorizedEmails(a => [added, ...a])
      setNewEmail({ email: '', name: '' })
    } catch (err) { alert(err.message) }
    finally { setEmailLoading(false) }
  }

  const removeAuthorizedEmail = async (id) => {
    await api.removeAuthorizedEmail(id)
    setAuthorizedEmails(a => a.filter(x => x.id !== id))
  }

  const updateRole = async (userId, role) => {
    await api.updateUser(userId, { role })
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
  }

  const handleDeleteDoc = async (id) => {
    if (!confirm('Remover este documento?')) return
    await api.deleteDocument(id)
    setDocuments(d => d.filter(x => x.id !== id))
  }

  const handleDownload = async (id) => {
    const { url } = await api.getDocumentUrl(id)
    window.open(url, '_blank')
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const filterTechs = tree.find(s => s.id === docFilters.specialtyId)?.technologies || []
  const filterMfrs = filterTechs.find(t => t.id === docFilters.technologyId)?.manufacturers || []

  const TABS = [
    { key: 'requests', label: 'Solicitações', icon: '🕐', count: pendingCount || requests.length },
    { key: 'emails', label: 'Emails Autorizados', icon: '✉️', count: authorizedEmails.length },
    { key: 'users', label: 'Usuários', icon: '👥', count: users.length },
    { key: 'documents', label: 'Documentos', icon: '📄', count: documents.length },
    { key: 'gallery', label: 'Galeria', icon: '🖼️', count: 0 },
    { key: 'stats', label: 'Estatísticas', icon: '📊' },
    { key: 'contribute', label: 'Contribuir', icon: '✏️', count: issues.length },
  ]

  return (
    <div style={S.layout}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarTop}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14 }}>EAS Expert</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Administração</p>
          </div>
        </div>
        <nav style={S.nav}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ ...S.navItem, ...(tab === t.key ? S.navActive : {}) }}>
              <span>{t.icon} {t.label}</span>
              {t.count !== undefined && <span style={{ ...S.pill, ...(t.key === 'requests' && pendingCount > 0 ? S.pillOrange : {}) }}>{t.count}</span>}
            </button>
          ))}
        </nav>
        <div style={S.sidebarBottom}>
          <button onClick={() => navigate('/')} style={S.footerBtn}>🏠 Dashboard</button>
          <button onClick={signOut} style={S.footerBtn}>↩ Sair</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>
        <div style={S.topBar}>
          <h1 style={S.pageTitle}>Painel Administrativo</h1>
          <button onClick={() => window.location.reload()} style={S.refreshBtn} title="Atualizar">🔄</button>
        </div>

        {/* ─── SOLICITAÇÕES ─── */}
        {tab === 'requests' && (
          <div>
            {pendingCount > 0 && (
              <div style={S.alertBanner}>🕐 {pendingCount} solicitação(ões) pendente(s) de aprovação</div>
            )}
            <div style={S.cardList}>
              {requests.map(r => (
                <div key={r.id} style={S.reqCard}>
                  <div style={S.reqLeft}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span className={`badge ${r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-yellow' : 'badge-yellow'}`}
                        style={{ background: r.status === 'approved' ? 'rgba(34,197,94,0.15)' : r.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: r.status === 'approved' ? '#4ade80' : r.status === 'rejected' ? '#f87171' : '#fbbf24' }}>
                        {r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.email}</p>
                    {r.reason && <p style={{ fontSize: 13, marginTop: 4 }}>Motivo: {r.reason}</p>}
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
                      Solicitado em {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => approveRequest(r.id)} style={S.approveBtn} title="Aprovar">✓</button>
                        <button onClick={() => rejectRequest(r.id)} style={S.rejectBtn} title="Rejeitar">✕</button>
                      </>
                    )}
                    {r.status !== 'pending' && (
                      <button onClick={() => deleteRequest(r.id)} style={S.deleteBtn} title="Remover">🗑️</button>
                    )}
                  </div>
                </div>
              ))}
              {requests.length === 0 && <p style={S.empty}>Nenhuma solicitação recebida.</p>}
            </div>
          </div>
        )}

        {/* ─── EMAILS AUTORIZADOS ─── */}
        {tab === 'emails' && (
          <div>
            <form onSubmit={addAuthorizedEmail} className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Nome</label>
                <input value={newEmail.name} onChange={e => setNewEmail(p => ({ ...p, name: e.target.value }))} placeholder="Nome do técnico" style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>E-mail</label>
                <input type="email" value={newEmail.email} onChange={e => setNewEmail(p => ({ ...p, email: e.target.value }))} placeholder="tecnico@empresa.com" style={S.input} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={emailLoading}>+ Autorizar</button>
            </form>
            <div style={S.cardList}>
              {authorizedEmails.map(e => (
                <div key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                  <div>
                    <p style={{ fontWeight: 500 }}>{e.name || '—'}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{e.email}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Adicionado em {new Date(e.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`badge badge-${e.is_active ? 'green' : 'yellow'}`}>{e.is_active ? 'Ativo' : 'Inativo'}</span>
                    <button onClick={() => removeAuthorizedEmail(e.id)} style={S.removeBtnSm}>Revogar</button>
                  </div>
                </div>
              ))}
              {authorizedEmails.length === 0 && <p style={S.empty}>Nenhum e-mail autorizado.</p>}
            </div>
          </div>
        )}

        {/* ─── USUÁRIOS ─── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{users.length} usuário(s) cadastrado(s)</p>
              <button className="btn btn-primary" onClick={() => setShowCreateUser(true)}>+ Novo Usuário</button>
            </div>
            <div style={S.cardList}>
              {users.map(u => (
                <div key={u.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <p style={{ fontWeight: 600, fontSize: 15 }}>{u.full_name || '—'}</p>
                        <span className={`badge badge-${u.role === 'admin' ? 'blue' : u.role === 'manager' ? 'yellow' : 'green'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </div>
                      {u.permissions && Object.keys(u.permissions).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {PERMISSIONS.filter(p => u.permissions[p.key]).map(p => (
                            <span key={p.key} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.2)' }}>{p.label}</span>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        Cadastrado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={S.filterSel}>
                      <option value="trainee">Trainee</option>
                      <option value="technician">Técnico</option>
                      <option value="manager">Gestor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p style={S.empty}>Nenhum usuário cadastrado.</p>}
            </div>
          </div>
        )}

        {/* ─── DOCUMENTOS ─── */}
        {tab === 'documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{documents.length} documento(s)</p>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>⬆️ Upload</button>
            </div>
            {documents.length === 0 && (
              <div style={S.bigDrop} onClick={() => setShowUpload(true)}>
                <span style={{ fontSize: 40 }}>⬆️</span>
                <p style={{ fontWeight: 500, fontSize: 16 }}>Clique para fazer upload de documentos</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>PDF, DOCX ou TXT • Você poderá categorizar antes de enviar</p>
              </div>
            )}
            {documents.length > 0 && (
              <div style={S.filterRow}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filtrar por:</span>
                <select value={docFilters.specialtyId} onChange={e => setDocFilters(f => ({ ...f, specialtyId: e.target.value, technologyId: '', manufacturerId: '' }))} style={S.filterSel}>
                  <option value="">Todas Especialidades</option>
                  {tree.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={docFilters.technologyId} onChange={e => setDocFilters(f => ({ ...f, technologyId: e.target.value, manufacturerId: '' }))} style={S.filterSel} disabled={!filterTechs.length}>
                  <option value="">Todas Tecnologias</option>
                  {filterTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={docFilters.manufacturerId} onChange={e => setDocFilters(f => ({ ...f, manufacturerId: e.target.value }))} style={S.filterSel} disabled={!filterMfrs.length}>
                  <option value="">Todos Fabricantes</option>
                  {filterMfrs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {(docFilters.specialtyId || docFilters.technologyId || docFilters.manufacturerId) && (
                  <button onClick={() => setDocFilters({ specialtyId: '', technologyId: '', manufacturerId: '' })} style={S.clearBtn}>✕ Limpar</button>
                )}
              </div>
            )}
            <div style={S.cardList}>
              {documents.map(doc => (
                <div key={doc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
                  <div style={S.docIcon}>📄</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{doc.title}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {doc.technologies?.name && <span className="badge badge-blue">{doc.technologies.name}</span>}
                      {doc.specialties?.name && !doc.technologies?.name && <span className="badge badge-blue">{doc.specialties.name}</span>}
                      {!doc.technologies?.name && !doc.specialties?.name && <span className="badge badge-blue">Geral</span>}
                      {doc.manufacturers?.name && <span className="badge badge-green">{doc.manufacturers.name}</span>}
                      <span className={`badge ${TYPE_COLORS[doc.type] || 'badge-blue'}`}>{DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Por {doc.profiles?.full_name || 'sistema'} em {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleDownload(doc.id)} style={S.iconBtn} title="Download">⬇️</button>
                    <button onClick={() => handleDeleteDoc(doc.id)} style={S.iconBtn} title="Remover">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── GALERIA ─── */}
        {tab === 'gallery' && (
          <div>
            <div style={{ ...S.bigDrop, cursor: 'default' }}>
              <span style={{ fontSize: 40 }}>🖼️</span>
              <p style={{ fontWeight: 500 }}>Galeria de Imagens</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Upload de fotos de equipamentos, instalações e referências visuais</p>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => alert('Em desenvolvimento')}>+ Adicionar imagem</button>
            </div>
          </div>
        )}

        {/* ─── ESTATÍSTICAS ─── */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 600 }}>
              {[
                { label: 'Total de Usuários', value: dashData.totalUsers ?? '—', icon: '👥' },
                { label: 'Documentos na Base', value: dashData.totalDocs ?? '—', icon: '📄' },
                { label: 'Issues em Aberto', value: dashData.openIssues ?? '—', icon: '🔧' },
                { label: 'Sessões de Chat', value: dashData.totalSessions ?? '—', icon: '💬' },
              ].map(s => (
                <div key={s.label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                  <p style={{ fontSize: 36, fontWeight: 700 }}>{s.value}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CONTRIBUIR ─── */}
        {tab === 'contribute' && (
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
              Problemas de campo registrados pelos técnicos aguardando validação.
            </p>
            <div style={S.cardList}>
              {issues.map(issue => (
                <div key={issue.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600 }}>{issue.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{issue.description?.slice(0, 150)}...</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {issue.technologies?.name && <span className="badge badge-blue">{issue.technologies.name}</span>}
                        {issue.manufacturers?.name && <span className="badge badge-green">{issue.manufacturers.name}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{new Date(issue.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`badge badge-${issue.status === 'validated' ? 'green' : issue.status === 'open' ? 'yellow' : 'blue'}`} style={{ flexShrink: 0 }}>{issue.status}</span>
                  </div>
                  {issue.issue_solutions?.filter(s => !s.is_approved).length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{issue.issue_solutions.filter(s => !s.is_approved).length} solução(ões) aguardando aprovação</p>
                    </div>
                  )}
                </div>
              ))}
              {issues.length === 0 && <p style={S.empty}>Nenhuma contribuição registrada.</p>}
            </div>
          </div>
        )}
      </main>

      {showUpload && <UploadModal tree={tree} onClose={() => setShowUpload(false)} onSuccess={doc => { setDocuments(d => [doc, ...d]); setShowUpload(false) }} />}
      {showCreateUser && <CreateUserModal onClose={() => setShowCreateUser(false)} onSuccess={result => { setUsers(u => [result.user?.profile || result, ...u]); setShowCreateUser(false) }} />}
    </div>
  )
}

const S = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' },
  sidebarTop: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', borderBottom: '1px solid var(--border)' },
  nav: { flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  navItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, background: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s', textAlign: 'left' },
  navActive: { background: 'var(--primary-light)', color: 'var(--primary)' },
  pill: { background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 11, padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)', flexShrink: 0 },
  pillOrange: { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' },
  sidebarBottom: { padding: '10px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 },
  footerBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', border: 'none' },
  main: { flex: 1, overflow: 'auto', padding: '28px 36px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  refreshBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', opacity: 0.6 },
  alertBanner: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14 },
  cardList: { display: 'flex', flexDirection: 'column', gap: 10 },
  reqCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  reqLeft: { flex: 1 },
  approveBtn: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid #4ade80', color: '#4ade80', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  rejectBtn: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid #f87171', color: '#f87171', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  deleteBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', opacity: 0.6 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 },
  filterRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  filterSel: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', borderRadius: 8, fontSize: 13 },
  clearBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  bigDrop: { border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '48px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  docIcon: { width: 40, height: 40, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, opacity: 0.7 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', fontSize: 14 },
  empty: { color: 'var(--text-muted)', padding: 16, textAlign: 'center' },
  removeBtnSm: { background: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', border: '1px solid var(--danger)', padding: '4px 10px', borderRadius: 6 }
}

const M = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 },
  box: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  close: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' },
  body: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  drop: { border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '32px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' },
  dropDrag: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  dropOk: { borderColor: 'var(--success)', background: 'rgba(34,197,94,0.05)' },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 },
  select: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }
}
