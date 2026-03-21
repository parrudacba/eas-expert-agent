import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const DOC_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'technical_doc', label: 'Documento Técnico' },
  { value: 'procedure', label: 'Procedimento' },
  { value: 'bulletin', label: 'Boletim' },
  { value: 'other', label: 'Outro' }
]

const TYPE_COLORS = {
  manual: 'badge-blue',
  technical_doc: 'badge-green',
  procedure: 'badge-yellow',
  bulletin: 'badge-blue',
  other: 'badge-green'
}

// ── UPLOAD MODAL ──────────────────────────────────────────────
function UploadModal({ tree, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'manual', specialtyId: '', technologyId: '', manufacturerId: '', equipmentModelId: '' })
  const [technologies, setTechnologies] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const selectedSpecialty = tree.find(s => s.id === form.specialtyId)

  useEffect(() => {
    if (form.specialtyId) {
      setTechnologies(selectedSpecialty?.technologies || [])
      setForm(f => ({ ...f, technologyId: '', manufacturerId: '', equipmentModelId: '' }))
      setManufacturers([]); setModels([])
    }
  }, [form.specialtyId])

  useEffect(() => {
    if (form.technologyId) {
      const tech = technologies.find(t => t.id === form.technologyId)
      setManufacturers(tech?.manufacturers || [])
      setForm(f => ({ ...f, manufacturerId: '', equipmentModelId: '' }))
      setModels([])
    }
  }, [form.technologyId])

  useEffect(() => {
    if (form.manufacturerId) {
      const mfr = manufacturers.find(m => m.id === form.manufacturerId)
      setModels(mfr?.equipment_models || [])
      setForm(f => ({ ...f, equipmentModelId: '' }))
    }
  }, [form.manufacturerId])

  const handleFile = (f) => {
    if (!f) return
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowed.includes(f.type)) { setError('Formato não suportado. Use PDF, DOCX ou TXT.'); return }
    setFile(f)
    setError('')
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Selecione um arquivo'); return }
    if (!form.title.trim()) { setError('Informe o título'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      const result = await api.uploadDocument(fd)
      onSuccess(result.document)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={modal.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal.box}>
        <div style={modal.header}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Upload de Documento</h2>
          <button onClick={onClose} style={modal.close}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={modal.body}>
          {/* Drop zone */}
          <div
            style={{ ...modal.dropzone, ...(drag ? modal.dropzoneDrag : {}), ...(file ? modal.dropzoneOk : {}) }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <span style={{ fontSize: 32 }}>📄</span>
                <p style={{ fontWeight: 600 }}>{file.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(file.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: 32 }}>⬆️</span>
                <p style={{ fontWeight: 500 }}>Clique ou arraste o arquivo</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>PDF, DOCX ou TXT • Máx. 50 MB</p>
              </>
            )}
          </div>

          {/* Título e Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={modal.label}>Título *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Nome do documento" style={modal.input} required />
            </div>
            <div>
              <label style={modal.label}>Tipo</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={modal.select}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Categorização */}
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorização</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={modal.label}>Especialidade</label>
              <select value={form.specialtyId} onChange={e => setForm(p => ({ ...p, specialtyId: e.target.value }))} style={modal.select}>
                <option value="">Geral</option>
                {tree.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={modal.label}>Tecnologia</label>
              <select value={form.technologyId} onChange={e => setForm(p => ({ ...p, technologyId: e.target.value }))} style={modal.select} disabled={!technologies.length}>
                <option value="">Geral</option>
                {technologies.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={modal.label}>Fabricante</label>
              <select value={form.manufacturerId} onChange={e => setForm(p => ({ ...p, manufacturerId: e.target.value }))} style={modal.select} disabled={!manufacturers.length}>
                <option value="">Todos</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={modal.label}>Modelo</label>
              <select value={form.equipmentModelId} onChange={e => setForm(p => ({ ...p, equipmentModelId: e.target.value }))} style={modal.select} disabled={!models.length}>
                <option value="">Todos</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name} {m.model_code ? `(${m.model_code})` : ''}</option>)}
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : '⬆️ Enviar documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ADMIN PRINCIPAL ───────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState('documents')
  const [dashData, setDashData] = useState({})
  const [users, setUsers] = useState([])
  const [issues, setIssues] = useState([])
  const [whatsapp, setWhatsapp] = useState([])
  const [documents, setDocuments] = useState([])
  const [tree, setTree] = useState([])
  const [docFilters, setDocFilters] = useState({ specialtyId: '', technologyId: '', manufacturerId: '' })
  const [showUpload, setShowUpload] = useState(false)
  const [newWA, setNewWA] = useState({ phoneNumber: '', name: '' })
  const [waLoading, setWaLoading] = useState(false)

  useEffect(() => {
    api.getTree().then(r => setTree(r.tree || []))
    api.getDashboard().then(setDashData).catch(() => {})
    api.getDocuments().then(r => setDocuments(r.documents || [])).catch(() => {})
    api.getUsers().then(r => setUsers(r.users || [])).catch(() => {})
    api.getFieldIssues().then(r => setIssues(r.issues || [])).catch(() => {})
    api.getWhatsappUsers().then(r => setWhatsapp(r.users || [])).catch(() => {})
  }, [])

  // Refiltrar documentos quando filtros mudam
  useEffect(() => {
    const params = {}
    if (docFilters.specialtyId) params.specialtyId = docFilters.specialtyId
    if (docFilters.technologyId) params.technologyId = docFilters.technologyId
    if (docFilters.manufacturerId) params.manufacturerId = docFilters.manufacturerId
    api.getDocuments(params).then(r => setDocuments(r.documents || [])).catch(() => {})
  }, [docFilters])

  const handleDeleteDoc = async (id) => {
    if (!confirm('Remover este documento?')) return
    await api.deleteDocument(id)
    setDocuments(d => d.filter(x => x.id !== id))
  }

  const handleDownload = async (id) => {
    const { url } = await api.getDocumentUrl(id)
    window.open(url, '_blank')
  }

  const addWhatsapp = async (e) => {
    e.preventDefault()
    setWaLoading(true)
    try {
      const { user: u } = await api.addWhatsappUser(newWA)
      setWhatsapp(w => [u, ...w])
      setNewWA({ phoneNumber: '', name: '' })
    } catch (err) { alert(err.message) }
    finally { setWaLoading(false) }
  }

  const updateRole = async (userId, role) => {
    await api.updateUser(userId, { role })
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
  }

  // Tecnologias disponíveis para filtro
  const filterTechnologies = tree.find(s => s.id === docFilters.specialtyId)?.technologies || []
  const filterManufacturers = filterTechnologies.find(t => t.id === docFilters.technologyId)?.manufacturers || []

  const TABS = [
    { key: 'documents', label: '📄 Documentos', count: documents.length },
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'users', label: '👥 Usuários', count: users.length },
    { key: 'issues', label: '🔧 Problemas de Campo', count: issues.length },
    { key: 'whatsapp', label: '📱 WhatsApp', count: whatsapp.length },
  ]

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14 }}>EAS Expert</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Administração</p>
          </div>
        </div>
        <nav style={styles.nav}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ ...styles.navItem, ...(tab === t.key ? styles.navActive : {}) }}>
              <span style={{ flex: 1, textAlign: 'left' }}>{t.label}</span>
              {t.count !== undefined && <span style={styles.badge}>{t.count}</span>}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <button onClick={() => navigate('/')} style={styles.footerBtn}>🏠 Dashboard</button>
          <button onClick={signOut} style={styles.footerBtn}>↩ Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>

        {/* ── DOCUMENTOS ── */}
        {tab === 'documents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={styles.pageTitle}>Documentos <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{documents.length} documento(s)</span></h1>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>⬆️ Upload</button>
            </div>

            {/* Upload drop zone grande (quando lista vazia) */}
            {documents.length === 0 && (
              <div style={styles.bigDrop} onClick={() => setShowUpload(true)}>
                <span style={{ fontSize: 40 }}>⬆️</span>
                <p style={{ fontWeight: 500, fontSize: 16 }}>Clique para fazer upload de documentos</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>PDF, DOCX ou TXT • Você poderá categorizar antes de enviar</p>
              </div>
            )}

            {/* Filtros */}
            {documents.length > 0 && (
              <div style={styles.filterRow}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filtrar por:</span>
                <select value={docFilters.specialtyId} onChange={e => setDocFilters(f => ({ ...f, specialtyId: e.target.value, technologyId: '', manufacturerId: '' }))} style={styles.filterSelect}>
                  <option value="">Todas Especialidades</option>
                  {tree.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={docFilters.technologyId} onChange={e => setDocFilters(f => ({ ...f, technologyId: e.target.value, manufacturerId: '' }))} style={styles.filterSelect} disabled={!filterTechnologies.length}>
                  <option value="">Todas Tecnologias</option>
                  {filterTechnologies.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={docFilters.manufacturerId} onChange={e => setDocFilters(f => ({ ...f, manufacturerId: e.target.value }))} style={styles.filterSelect} disabled={!filterManufacturers.length}>
                  <option value="">Todos Fabricantes</option>
                  {filterManufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {(docFilters.specialtyId || docFilters.technologyId || docFilters.manufacturerId) && (
                  <button onClick={() => setDocFilters({ specialtyId: '', technologyId: '', manufacturerId: '' })} style={styles.clearFilter}>✕ Limpar</button>
                )}
              </div>
            )}

            {/* Lista de documentos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map(doc => (
                <div key={doc.id} className="card" style={styles.docRow}>
                  <div style={styles.docIcon}>📄</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{doc.title}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {doc.technologies?.name && <span className={`badge ${TYPE_COLORS[doc.type] || 'badge-blue'}`}>{doc.technologies.name}</span>}
                      {doc.specialties?.name && !doc.technologies?.name && <span className="badge badge-green">{doc.specialties.name}</span>}
                      {doc.manufacturers?.name && <span className="badge badge-green">{doc.manufacturers.name}</span>}
                      {doc.equipment_models?.name && <span className="badge badge-yellow">{doc.equipment_models.name}</span>}
                      <span className={`badge ${TYPE_COLORS[doc.type] || 'badge-blue'}`}>{DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                      Por {doc.profiles?.full_name || 'sistema'} em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleDownload(doc.id)} style={styles.iconBtn} title="Download">⬇️</button>
                    <button onClick={() => handleDeleteDoc(doc.id)} style={{ ...styles.iconBtn, color: 'var(--danger)' }} title="Remover">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <h1 style={styles.pageTitle}>Dashboard</h1>
            <div style={styles.statsGrid}>
              {[
                { label: 'Usuários', value: dashData.totalUsers ?? '—', icon: '👥' },
                { label: 'Documentos', value: dashData.totalDocs ?? '—', icon: '📄' },
                { label: 'Issues abertos', value: dashData.openIssues ?? '—', icon: '🔧' },
                { label: 'Sessões de chat', value: dashData.totalSessions ?? '—', icon: '💬' },
              ].map(s => (
                <div key={s.label} className="card" style={styles.statCard}>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                  <p style={{ fontSize: 32, fontWeight: 700 }}>{s.value}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USUÁRIOS ── */}
        {tab === 'users' && (
          <div>
            <h1 style={styles.pageTitle}>Usuários</h1>
            <table style={styles.table}>
              <thead><tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Cadastro</th>
                <th style={styles.th}>Alterar Role</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>{u.full_name || '—'}</td>
                    <td style={styles.td}><span className={`badge badge-${u.role === 'admin' ? 'blue' : 'green'}`}>{u.role}</span></td>
                    <td style={styles.td}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={styles.td}>
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={styles.filterSelect}>
                        <option value="trainee">Trainee</option>
                        <option value="technician">Técnico</option>
                        <option value="manager">Gestor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PROBLEMAS DE CAMPO ── */}
        {tab === 'issues' && (
          <div>
            <h1 style={styles.pageTitle}>Problemas de Campo</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {issues.map(issue => (
                <div key={issue.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600 }}>{issue.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{issue.description?.slice(0, 120)}...</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {issue.technologies?.name && <span className="badge badge-blue">{issue.technologies.name}</span>}
                        {issue.manufacturers?.name && <span className="badge badge-green">{issue.manufacturers.name}</span>}
                      </div>
                    </div>
                    <span className={`badge badge-${issue.status === 'open' ? 'yellow' : 'green'}`} style={{ flexShrink: 0 }}>{issue.status}</span>
                  </div>
                </div>
              ))}
              {issues.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum problema registrado.</p>}
            </div>
          </div>
        )}

        {/* ── WHATSAPP ── */}
        {tab === 'whatsapp' && (
          <div>
            <h1 style={styles.pageTitle}>Acesso WhatsApp</h1>
            <form onSubmit={addWhatsapp} className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nome</label>
                <input value={newWA.name} onChange={e => setNewWA(p => ({ ...p, name: e.target.value }))} placeholder="Nome do técnico" style={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Número (com DDI)</label>
                <input value={newWA.phoneNumber} onChange={e => setNewWA(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+5511999999999" style={styles.input} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={waLoading}>+ Autorizar</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {whatsapp.map(u => (
                <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                  <div>
                    <p style={{ fontWeight: 500 }}>{u.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.phone_number}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className={`badge badge-${u.is_active ? 'green' : 'yellow'}`}>{u.is_active ? 'Ativo' : 'Inativo'}</span>
                    <button onClick={() => api.removeWhatsappUser(u.id).then(() => setWhatsapp(w => w.filter(x => x.id !== u.id)))} style={styles.removeBtn}>Revogar</button>
                  </div>
                </div>
              ))}
              {whatsapp.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum número autorizado.</p>}
            </div>
          </div>
        )}
      </main>

      {/* Modal de upload */}
      {showUpload && (
        <UploadModal
          tree={tree}
          onClose={() => setShowUpload(false)}
          onSuccess={(doc) => {
            setDocuments(d => [doc, ...d])
            setShowUpload(false)
          }}
        />
      )}
    </div>
  )
}

const styles = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', borderBottom: '1px solid var(--border)' },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'none', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  navActive: { background: 'var(--primary-light)', color: 'var(--primary)' },
  badge: { background: 'var(--bg)', color: 'var(--text-muted)', fontSize: 11, padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)' },
  sidebarFooter: { padding: '12px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 },
  footerBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', border: 'none' },
  main: { flex: 1, overflow: 'auto', padding: '32px 40px' },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  bigDrop: { border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '48px', textAlign: 'center', cursor: 'pointer', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' },
  filterRow: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  filterSelect: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', borderRadius: 8, fontSize: 13 },
  clearFilter: { background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  docRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' },
  docIcon: { width: 40, height: 40, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, opacity: 0.7 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  statCard: { display: 'flex', flexDirection: 'column', gap: 8 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', fontSize: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 },
  removeBtn: { background: 'none', color: 'var(--danger)', fontSize: 13, cursor: 'pointer', border: '1px solid var(--danger)', padding: '4px 10px', borderRadius: 6 }
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 },
  box: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' },
  close: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' },
  body: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  dropzone: { border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '32px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' },
  dropzoneDrag: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  dropzoneOk: { borderColor: 'var(--success)', background: 'rgba(34,197,94,0.05)' },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 },
  select: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }
}
