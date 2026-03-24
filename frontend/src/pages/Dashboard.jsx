import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../services/api.js'
import { useMobile } from '../hooks/useMobile.js'

const ICONS = { eas: '📡', cftv: '📷', 'controle-acesso': '🔐' }
const MODE_ICONS = { support: '🔧', training: '🎓' }
const CATEGORY_ICONS = {
  'Antena': '📡', 'Pedestal': '🚧', 'Antena/Pedestal': '📡',
  'Desativador': '🔓', 'Verificador': '🔍',
  'Etiqueta Rígida': '🏷️', 'Etiqueta': '🏷️',
  'Desacoplador': '🔌',
  'Câmera': '📷', 'DVR': '🖥️', 'NVR': '🖥️', 'DVR/NVR': '🖥️',
  'Leitor': '🔐', 'Controlador': '⚙️', 'Eletrofecho': '🔒',
  'Outros': '📦'
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [tree, setTree] = useState([])
  const [selected, setSelected] = useState({ specialty: null, technology: null, manufacturer: null, category: null, model: null })
  const [mode, setMode] = useState('support')
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    api.getTree().then(r => { setTree(r.tree || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  // Fecha menu ao navegar
  useEffect(() => { setMenuOpen(false) }, [])

  const startChat = async () => {
    try {
      const context = {
        specialtyId:      selected.specialty?.id,
        technologyId:     selected.technology?.id,
        manufacturerId:   selected.manufacturer?.id,
        equipmentModelId: selected.model?.id
      }
      const { session } = await api.createSession({ mode, context })
      navigate(`/chat/${session.id}`, {
        state: {
          manufacturer: selected.manufacturer || null,
          model: selected.model || null
        }
      })
    } catch (err) {
      alert('Erro ao iniciar sessão: ' + err.message)
    }
  }

  // Modelos e categorias do fabricante selecionado
  const mfrModels = selected.manufacturer?.equipment_models || []
  const mfrCategories = (() => {
    if (!mfrModels.length) return []
    const grouped = {}
    mfrModels.forEach(m => {
      const cat = m.category || 'Sem categoria'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(m)
    })
    return Object.entries(grouped).map(([name, models]) => ({ name, models }))
  })()
  // Mostra passo de Tipo sempre que o fabricante tem modelos cadastrados
  const showCategoryStep = mfrModels.length > 0
  const modelsToShow = selected.category
    ? (mfrCategories.find(c => c.name === selected.category)?.models || [])
    : []

  // Pode iniciar: sem modelos → basta fabricante; com modelos → exige categoria + modelo
  const canStart = selected.specialty !== null && (
    !selected.manufacturer ||
    mfrModels.length === 0 ||
    selected.model !== null
  )

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ────
  const SidebarContent = () => (
    <>
      <div style={S.sidebarLogo}>
        <span style={{ fontSize: 24 }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>EAS Expert</span>
        {isMobile && (
          <button onClick={() => setMenuOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1 }}>✕</button>
        )}
      </div>
      <nav style={S.nav}>
        <button style={{ ...S.navItem, ...S.navActive }} onClick={() => { navigate('/'); setMenuOpen(false) }}>🏠 Dashboard</button>
        <button style={S.navItem} onClick={() => { navigate('/chat'); setMenuOpen(false) }}>💬 Chat</button>
        {profile?.role === 'admin' || profile?.permissions?.admin_panel
          ? <button style={S.navItem} onClick={() => { navigate('/admin'); setMenuOpen(false) }}>⚙️ Admin</button>
          : null}
      </nav>
      <div style={S.sidebarUser}>
        <div style={S.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={S.userEmail}>{user?.email}</p>
        </div>
        <button onClick={signOut} style={S.signOut} title="Sair">↩</button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <aside style={S.sidebar}>
          <SidebarContent />
        </aside>
      )}

      {/* ── Mobile drawer overlay ── */}
      {isMobile && menuOpen && (
        <div style={S.overlay} onClick={() => setMenuOpen(false)} />
      )}
      {isMobile && (
        <aside style={{ ...S.sidebar, position: 'fixed', top: 0, left: menuOpen ? 0 : -260, height: '100%', zIndex: 300, transition: 'left 0.25s ease', boxShadow: menuOpen ? '4px 0 20px rgba(0,0,0,0.4)' : 'none' }}>
          <SidebarContent />
        </aside>
      )}

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={S.mobileTopBar}>
            <button onClick={() => setMenuOpen(true)} style={S.hamburger}>☰</button>
            <span style={{ fontWeight: 700, fontSize: 16 }}>⚡ EAS Expert</span>
            <div style={S.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
          </div>
        )}

        <div style={{ padding: isMobile ? '16px' : '32px 40px', flex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: isMobile ? 20 : 32 }}>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, marginBottom: 4 }}>Nova Consulta</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? 13 : 15 }}>Selecione o contexto para o agente responder com mais precisão</p>
          </div>

          {/* Modo de atendimento */}
          <div style={{ marginBottom: isMobile ? 20 : 32 }}>
            <h2 style={S.sectionTitle}>Modo de atendimento</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 10 : 16, maxWidth: isMobile ? '100%' : 600 }}>
              {[
                { key: 'support',  label: 'Suporte Técnico', desc: 'Diagnóstico e resolução de problemas em campo' },
                { key: 'training', label: 'Treinamento',     desc: 'Aprendizado guiado e simulações técnicas' }
              ].map(m => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  style={{ ...S.modeCard, ...(mode === m.key ? S.modeCardActive : {}) }}>
                  <span style={{ fontSize: isMobile ? 22 : 28 }}>{MODE_ICONS[m.key]}</span>
                  <strong style={{ fontSize: isMobile ? 13 : 15 }}>{m.label}</strong>
                  {!isMobile && <p style={S.modeDesc}>{m.desc}</p>}
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
              <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                <h2 style={S.sectionTitle}>Especialidade</h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: isMobile ? 8 : 12 }}>
                  {tree.map(s => (
                    <button key={s.id} onClick={() => setSelected({ specialty: s, technology: null, manufacturer: null, category: null, model: null })}
                      style={{ ...S.treeCard, ...(selected.specialty?.id === s.id ? S.treeCardActive : {}), padding: isMobile ? '14px 8px' : '20px 12px' }}>
                      <span style={{ fontSize: isMobile ? 24 : 28 }}>{ICONS[s.slug] || '📋'}</span>
                      <span style={{ fontWeight: 600, fontSize: isMobile ? 12 : 14 }}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tecnologia */}
              {selected.specialty && (
                <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                  <h2 style={S.sectionTitle}>Tecnologia</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: isMobile ? 8 : 12 }}>
                    {selected.specialty.technologies?.map(t => (
                      <button key={t.id} onClick={() => setSelected(p => ({ ...p, technology: t, manufacturer: null, category: null, model: null }))}
                        style={{ ...S.treeCard, ...(selected.technology?.id === t.id ? S.treeCardActive : {}), padding: isMobile ? '14px 8px' : '20px 12px' }}>
                        {t.frequency && <span className="badge badge-blue" style={{ fontSize: 11 }}>{t.frequency}</span>}
                        <span style={{ fontWeight: 600, fontSize: isMobile ? 12 : 14, marginTop: 4 }}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fabricante */}
              {selected.technology && (
                <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                  <h2 style={S.sectionTitle}>Fabricante</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 10 }}>
                    {selected.technology.manufacturers?.map(m => (
                      <button key={m.id}
                        onClick={() => setSelected(p => ({ ...p, manufacturer: m, category: null, model: null }))}
                        style={{ ...S.chip, ...(selected.manufacturer?.id === m.id ? S.chipActive : {}), minHeight: 44, padding: isMobile ? '10px 14px' : '8px 16px', fontSize: isMobile ? 14 : 13 }}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo de equipamento — aparece sempre que fabricante tem modelos categorizados */}
              {selected.manufacturer && showCategoryStep && (
                <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                  <h2 style={S.sectionTitle}>Tipo de Equipamento</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(150px, 1fr))', gap: isMobile ? 8 : 12 }}>
                    {mfrCategories.map(cat => (
                      <button key={cat.name}
                        onClick={() => setSelected(p => ({ ...p, category: cat.name, model: null }))}
                        style={{ ...S.treeCard, ...(selected.category === cat.name ? S.treeCardActive : {}), padding: isMobile ? '14px 8px' : '18px 12px' }}>
                        <span style={{ fontSize: isMobile ? 24 : 28 }}>{CATEGORY_ICONS[cat.name] || '📦'}</span>
                        <span style={{ fontWeight: 600, fontSize: isMobile ? 12 : 13 }}>{cat.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cat.models.length} modelo{cat.models.length !== 1 ? 's' : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modelo */}
              {selected.manufacturer && mfrModels.length > 0 && (!showCategoryStep || selected.category) && (
                <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                  <h2 style={S.sectionTitle}>Modelo</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 10 }}>
                    {modelsToShow.map(m => (
                      <button key={m.id}
                        onClick={() => setSelected(p => ({ ...p, model: m }))}
                        style={{ ...S.chip, ...(selected.model?.id === m.id ? S.chipActive : {}), minHeight: 44, padding: isMobile ? '10px 14px' : '8px 16px', fontSize: isMobile ? 13 : 13 }}>
                        {m.name}{m.model_code ? ` (${m.model_code})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Botão iniciar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {selected.specialty && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 13, flexWrap: 'wrap' }}>
                <span>📍</span>
                <span>{[selected.specialty?.name, selected.technology?.name, selected.manufacturer?.name, selected.category, selected.model?.name].filter(Boolean).join(' › ')}</span>
              </div>
            )}
            <button
              className="btn btn-primary"
              onClick={startChat}
              disabled={!canStart}
              style={{ padding: isMobile ? '16px' : '14px 32px', fontSize: 15, justifyContent: 'center' }}
            >
              {MODE_ICONS[mode]} Iniciar {mode === 'support' ? 'Suporte' : 'Treinamento'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

const S = {
  sidebar:      { width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarLogo:  { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', borderBottom: '1px solid var(--border)' },
  nav:          { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem:      { display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 8, background: 'none', color: 'var(--text-dim)', fontSize: 14, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', minHeight: 44 },
  navActive:    { background: 'var(--primary-light)', color: 'var(--primary)' },
  sidebarUser:  { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--border)' },
  avatar:       { width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  userEmail:    { fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signOut:      { background: 'none', color: 'var(--text-muted)', fontSize: 18, padding: 4, flexShrink: 0, cursor: 'pointer' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 299 },
  mobileTopBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  hamburger:    { background: 'none', border: 'none', color: 'var(--text)', fontSize: 22, padding: 4, lineHeight: 1, cursor: 'pointer' },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  modeCard:     { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '16px', background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', minHeight: 44 },
  modeCardActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  modeDesc:     { color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 },
  treeCard:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
  treeCardActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
  chip:         { background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 20, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text)' },
  chipActive:   { borderColor: 'var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)' },
}
