import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../services/api.js'

const ICONS = { eas: '📡', cftv: '📷', 'controle-acesso': '🔐' }
const MODE_ICONS = { support: '🔧', training: '🎓' }

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [tree, setTree] = useState([])
  const [selected, setSelected] = useState({ specialty: null, technology: null, manufacturer: null, model: null })
  const [mode, setMode] = useState('support')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTree().then(r => { setTree(r.tree || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const startChat = async () => {
    try {
      const context = {
        specialtyId: selected.specialty?.id,
        technologyId: selected.technology?.id,
        manufacturerId: selected.manufacturer?.id,
        equipmentModelId: selected.model?.id
      }
      const { session } = await api.createSession({ mode, context })
      navigate(`/chat/${session.id}`)
    } catch (err) {
      alert('Erro ao iniciar sessão: ' + err.message)
    }
  }

  const canStart = selected.specialty !== null

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>EAS Expert</span>
        </div>
        <nav style={styles.nav}>
          <button style={{ ...styles.navItem, ...styles.navActive }}>🏠 Dashboard</button>
          <button style={styles.navItem} onClick={() => navigate('/chat')}>💬 Chat</button>
          <button style={styles.navItem} onClick={() => navigate('/admin')}>⚙️ Admin</button>
        </nav>
        <div style={styles.sidebarUser}>
          <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={styles.userEmail}>{user?.email}</p>
          </div>
          <button onClick={signOut} style={styles.signOut} title="Sair">↩</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Nova Consulta</h1>
            <p style={styles.subtitle}>Selecione o contexto para o agente responder com mais precisão</p>
          </div>
        </div>

        {/* Modo */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Modo de atendimento</h2>
          <div style={styles.modeGrid}>
            {[
              { key: 'support', label: 'Suporte Técnico', desc: 'Diagnóstico e resolução de problemas em campo' },
              { key: 'training', label: 'Treinamento', desc: 'Aprendizado guiado e simulações técnicas' }
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                style={{ ...styles.modeCard, ...(mode === m.key ? styles.modeCardActive : {}) }}>
                <span style={styles.modeIcon}>{MODE_ICONS[m.key]}</span>
                <strong>{m.label}</strong>
                <p style={styles.modeDesc}>{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Árvore de seleção */}
        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: 24 }}>Carregando...</div>
        ) : (
          <>
            {/* Especialidade */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Especialidade</h2>
              <div style={styles.grid3}>
                {tree.map(s => (
                  <button key={s.id} onClick={() => setSelected({ specialty: s, technology: null, manufacturer: null, model: null })}
                    style={{ ...styles.treeCard, ...(selected.specialty?.id === s.id ? styles.treeCardActive : {}) }}>
                    <span style={{ fontSize: 28 }}>{ICONS[s.slug] || '📋'}</span>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tecnologia */}
            {selected.specialty && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Tecnologia</h2>
                <div style={styles.grid3}>
                  {selected.specialty.technologies?.map(t => (
                    <button key={t.id} onClick={() => setSelected(p => ({ ...p, technology: t, manufacturer: null, model: null }))}
                      style={{ ...styles.treeCard, ...(selected.technology?.id === t.id ? styles.treeCardActive : {}) }}>
                      {t.frequency && <span className="badge badge-blue" style={{ fontSize: 11 }}>{t.frequency}</span>}
                      <span style={{ fontWeight: 600, marginTop: 4 }}>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fabricante */}
            {selected.technology && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Fabricante</h2>
                <div style={styles.gridWrap}>
                  {selected.technology.manufacturers?.map(m => (
                    <button key={m.id} onClick={() => setSelected(p => ({ ...p, manufacturer: m, model: null }))}
                      style={{ ...styles.chip, ...(selected.manufacturer?.id === m.id ? styles.chipActive : {}) }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modelo */}
            {selected.manufacturer && selected.manufacturer.equipment_models?.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Modelo <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}>(opcional)</span></h2>
                <div style={styles.gridWrap}>
                  {selected.manufacturer.equipment_models.map(m => (
                    <button key={m.id} onClick={() => setSelected(p => ({ ...p, model: p.model?.id === m.id ? null : m }))}
                      style={{ ...styles.chip, ...(selected.model?.id === m.id ? styles.chipActive : {}) }}>
                      {m.name} {m.model_code && <span style={{ opacity: 0.6, fontSize: 11 }}>({m.model_code})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Botão iniciar */}
        <div style={styles.startArea}>
          {selected.specialty && (
            <div style={styles.contextSummary}>
              <span>📍</span>
              <span>{[selected.specialty?.name, selected.technology?.name, selected.manufacturer?.name, selected.model?.name].filter(Boolean).join(' › ')}</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={startChat} disabled={!canStart} style={{ padding: '14px 32px', fontSize: 15 }}>
            {MODE_ICONS[mode]} Iniciar {mode === 'support' ? 'Suporte' : 'Treinamento'}
          </button>
        </div>
      </main>
    </div>
  )
}

const styles = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', borderBottom: '1px solid var(--border)' },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', color: 'var(--text-dim)', fontSize: 14, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' },
  navActive: { background: 'var(--primary-light)', color: 'var(--primary)' },
  sidebarUser: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border)' },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  userEmail: { fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signOut: { background: 'none', color: 'var(--text-muted)', fontSize: 18, padding: 4, flexShrink: 0, cursor: 'pointer' },
  main: { flex: 1, overflow: 'auto', padding: '32px 40px' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 6 },
  subtitle: { color: 'var(--text-muted)', fontSize: 15 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  modeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 },
  modeCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '20px', background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  modeCardActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  modeIcon: { fontSize: 28 },
  modeDesc: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, maxWidth: 700 },
  treeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 12px', background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
  treeCardActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  gridWrap: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  chip: { padding: '8px 16px', background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text)' },
  chipActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)' },
  startArea: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border)' },
  contextSummary: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 14 }
}
