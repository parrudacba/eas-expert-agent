import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState({})
  const [users, setUsers] = useState([])
  const [issues, setIssues] = useState([])
  const [whatsapp, setWhatsapp] = useState([])
  const [newWA, setNewWA] = useState({ phoneNumber: '', name: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => {})
    api.getUsers().then(r => setUsers(r.users || [])).catch(() => {})
    api.getFieldIssues().then(r => setIssues(r.issues || [])).catch(() => {})
    api.getWhatsappUsers().then(r => setWhatsapp(r.users || [])).catch(() => {})
  }, [])

  const addWhatsapp = async (e) => {
    e.preventDefault()
    if (!newWA.phoneNumber || !newWA.name) return
    setLoading(true)
    try {
      const { user } = await api.addWhatsappUser(newWA)
      setWhatsapp(w => [user, ...w])
      setNewWA({ phoneNumber: '', name: '' })
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }

  const removeWhatsapp = async (id) => {
    await api.removeWhatsappUser(id)
    setWhatsapp(w => w.filter(u => u.id !== id))
  }

  const updateRole = async (userId, role) => {
    await api.updateUser(userId, { role })
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
  }

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'users', label: '👥 Usuários' },
    { key: 'issues', label: '🔧 Problemas de Campo' },
    { key: 'whatsapp', label: '📱 WhatsApp' },
  ]

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar</button>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>⚙️ Administração</h2>
        </div>
        <nav style={styles.nav}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ ...styles.navItem, ...(tab === t.key ? styles.navActive : {}) }}>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={styles.main}>
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <h1 style={styles.pageTitle}>Dashboard</h1>
            <div style={styles.statsGrid}>
              {[
                { label: 'Usuários', value: data.totalUsers ?? '—', icon: '👥' },
                { label: 'Documentos', value: data.totalDocs ?? '—', icon: '📄' },
                { label: 'Issues abertos', value: data.openIssues ?? '—', icon: '🔧' },
                { label: 'Sessões de chat', value: data.totalSessions ?? '—', icon: '💬' },
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

        {/* Usuários */}
        {tab === 'users' && (
          <div>
            <h1 style={styles.pageTitle}>Usuários</h1>
            <table style={styles.table}>
              <thead><tr>
                <th style={styles.th}>Nome / E-mail</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Cadastro</th>
                <th style={styles.th}>Ações</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>{u.full_name || '—'}</td>
                    <td style={styles.td}>
                      <span className={`badge badge-${u.role === 'admin' ? 'blue' : 'green'}`}>{u.role}</span>
                    </td>
                    <td style={styles.td}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={styles.td}>
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={styles.select}>
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

        {/* Problemas de Campo */}
        {tab === 'issues' && (
          <div>
            <h1 style={styles.pageTitle}>Problemas de Campo</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {issues.map(issue => (
                <div key={issue.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{issue.title}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{issue.description?.slice(0, 120)}...</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {issue.technologies?.name && <span className="badge badge-blue">{issue.technologies.name}</span>}
                        {issue.manufacturers?.name && <span className="badge badge-green">{issue.manufacturers.name}</span>}
                      </div>
                    </div>
                    <span className={`badge badge-${issue.status === 'open' ? 'yellow' : 'green'}`}>{issue.status}</span>
                  </div>
                  {issue.issue_solutions?.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{issue.issue_solutions.length} solução(ões)</p>
                    </div>
                  )}
                </div>
              ))}
              {issues.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum problema registrado.</p>}
            </div>
          </div>
        )}

        {/* WhatsApp */}
        {tab === 'whatsapp' && (
          <div>
            <h1 style={styles.pageTitle}>Acesso WhatsApp</h1>
            <form onSubmit={addWhatsapp} className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Nome</label>
                <input value={newWA.name} onChange={e => setNewWA(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do técnico" style={styles.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Número (com DDI)</label>
                <input value={newWA.phoneNumber} onChange={e => setNewWA(p => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="+5511999999999" style={styles.input} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                + Autorizar
              </button>
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
                    <button onClick={() => removeWhatsapp(u.id)} style={styles.removeBtn}>Revogar</button>
                  </div>
                </div>
              ))}
              {whatsapp.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum número autorizado.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '16px', borderBottom: '1px solid var(--border)' },
  backBtn: { background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 8, border: 'none' },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'none', color: 'var(--text-dim)', fontSize: 13, textAlign: 'left', cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  navActive: { background: 'var(--primary-light)', color: 'var(--primary)' },
  main: { flex: 1, overflow: 'auto', padding: '32px 40px' },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  statCard: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', fontSize: 14 },
  select: { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', borderRadius: 6, fontSize: 13 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 },
  removeBtn: { background: 'none', color: 'var(--danger)', fontSize: 13, cursor: 'pointer', border: '1px solid var(--danger)', padding: '4px 10px', borderRadius: 6 }
}
