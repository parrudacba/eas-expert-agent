import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../services/api.js'
import { useMobile } from '../hooks/useMobile.js'

const ICONS = { eas: '📡', cftv: '📷', 'controle-acesso': '🔐' }
const MODE_ICONS = { support: '🔧', training: '🎓' }

const SPECIALTY_TYPES = {
  eas: [
    { name: 'Antena/Pedestal', icon: '📡' },
    { name: 'Desativador',     icon: '🔓' },
    { name: 'Verificador',     icon: '🔍' },
    { name: 'Desacoplador',    icon: '🔌' },
    { name: 'Etiqueta Rígida', icon: '🏷️' },
  ],
  cftv: [
    { name: 'Câmera',  icon: '📷' },
    { name: 'DVR/NVR', icon: '🖥️' },
  ],
  'controle-acesso': [
    { name: 'Leitor',      icon: '🔐' },
    { name: 'Controlador', icon: '⚙️' },
    { name: 'Eletrofecho', icon: '🔒' },
  ],
}


// Linha colapsada de etapa concluída — clicável para voltar
function DoneRow({ label, summary, onBack }) {
  return (
    <div style={S.doneRow} onClick={onBack} title="Clique para editar">
      <div style={S.doneCheck}>✓</div>
      <span style={S.doneLabel}>{label}</span>
      <span style={S.doneSummary}>{summary}</span>
      <span style={S.doneEdit}>↩</span>
    </div>
  )
}

// Etapa ativa — mostra número + título + conteúdo
function ActiveStep({ num, label, children }) {
  return (
    <div style={S.activeStep}>
      <div style={S.activeHeader}>
        <div style={S.activeNum}>{num}</div>
        <span style={S.activeLabel}>{label}</span>
      </div>
      <div style={S.activeBody}>{children}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [tree, setTree] = useState([])
  const [selected, setSelected] = useState({ specialty: null, technology: null, manufacturer: null, category: null, model: null })
  const [mode, setMode] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    api.getTree().then(r => { setTree(r.tree || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { setMenuOpen(false) }, [])

  const startChat = async () => {
    try {
      const context = {
        specialtyId:      selected.specialty?.id,
        technologyId:     selected.technology?.id,
        manufacturerId:   selected.manufacturer?.id,
        equipmentModelId: selected.model?.id
      }
      const { session } = await api.createSession({ mode: mode || 'support', context })
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

  // Modelos do fabricante selecionado
  const mfrModels = selected.manufacturer?.equipment_models || []

  // Lista de tipos para a especialidade atual
  const specialtyTypes = selected.specialty
    ? (SPECIALTY_TYPES[selected.specialty.slug] || [])
    : []

  // Passo de Tipo existe quando há fabricante E especialidade com tipos definidos
  const showCategoryStep = selected.manufacturer !== null && specialtyTypes.length > 0

  const categoriesWithModels = specialtyTypes.map(t => ({
    ...t,
    models: mfrModels.filter(m => m.category === t.name)
  }))

  const modelsToShow = selected.category
    ? (categoriesWithModels.find(c => c.name === selected.category)?.models || [])
    : []

  // ── Handlers que selecionam e avançam ──────────────────────────────────────
  const selectMode = (key) => {
    setMode(key)
    setCurrentStep(2)
  }

  const selectSpecialty = (s) => {
    setSelected({ specialty: s, technology: null, manufacturer: null, category: null, model: null })
    setCurrentStep(3)
  }

  const selectTechnology = (t) => {
    setSelected(p => ({ ...p, technology: t, manufacturer: null, category: null, model: null }))
    setCurrentStep(4)
  }

  const selectManufacturer = (m) => {
    const types = SPECIALTY_TYPES[selected.specialty?.slug] || []
    setSelected(p => ({ ...p, manufacturer: m, category: null, model: null }))
    if (types.length > 0) {
      setCurrentStep(5)
    } else {
      setCurrentStep(6)
    }
  }

  const selectCategory = (catName) => {
    setSelected(p => ({ ...p, category: catName, model: null }))
    setCurrentStep(6)
  }

  // Volta para a etapa N e limpa seleções posteriores
  const goBackTo = (step) => {
    setCurrentStep(step)
    if (step === 1) {
      setMode(null)
      setSelected({ specialty: null, technology: null, manufacturer: null, category: null, model: null })
    } else if (step === 2) {
      setSelected({ specialty: null, technology: null, manufacturer: null, category: null, model: null })
    } else if (step === 3) {
      setSelected(p => ({ ...p, technology: null, manufacturer: null, category: null, model: null }))
    } else if (step === 4) {
      setSelected(p => ({ ...p, manufacturer: null, category: null, model: null }))
    } else if (step === 5) {
      setSelected(p => ({ ...p, category: null, model: null }))
    } else if (step === 6) {
      setSelected(p => ({ ...p, model: null }))
    }
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
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

  // ── Sumários para linhas colapsadas ────────────────────────────────────────
  const modeSummary   = mode === 'support' ? '🔧 Suporte Técnico' : mode === 'training' ? '🎓 Treinamento' : null
  const spSummary     = selected.specialty ? `${ICONS[selected.specialty.slug] || '📋'} ${selected.specialty.name}` : null
  const techSummary   = selected.technology ? (selected.technology.frequency || selected.technology.name) : null
  const mfrSummary    = selected.manufacturer?.name || null
  const catSummary    = selected.category ? `${categoriesWithModels.find(c => c.name === selected.category)?.icon || '📦'} ${selected.category}` : null

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={S.sidebar}>
          <SidebarContent />
        </aside>
      )}

      {/* Mobile drawer */}
      {isMobile && menuOpen && (
        <div style={S.overlay} onClick={() => setMenuOpen(false)} />
      )}
      {isMobile && (
        <aside style={{ ...S.sidebar, position: 'fixed', top: 0, left: menuOpen ? 0 : -260, height: '100%', zIndex: 300, transition: 'left 0.25s ease', boxShadow: menuOpen ? '4px 0 20px rgba(0,0,0,0.4)' : 'none' }}>
          <SidebarContent />
        </aside>
      )}

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {isMobile && (
          <div style={S.mobileTopBar}>
            <button onClick={() => setMenuOpen(true)} style={S.hamburger}>☰</button>
            <span style={{ fontWeight: 700, fontSize: 16 }}>⚡ EAS Expert</span>
            <div style={S.avatar}>{user?.email?.[0]?.toUpperCase()}</div>
          </div>
        )}

        <div style={{ padding: isMobile ? '16px' : '28px 36px', flex: 1, maxWidth: 680, width: '100%' }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginBottom: 2 }}>Nova Consulta</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Selecione o contexto para o agente responder com mais precisão</p>
          </div>

          {/* ── Wizard ─────────────────────────────────────────────────────── */}
          <div style={S.wizard}>

            {/* ETAPA 1 — Modo */}
            {currentStep > 1 && mode ? (
              <DoneRow label="Modo" summary={modeSummary} onBack={() => goBackTo(1)} />
            ) : currentStep === 1 ? (
              <ActiveStep num={1} label="Modo de Atendimento">
                <div style={S.chipGroup}>
                  {[
                    { key: 'support',  label: 'Suporte Técnico', icon: '🔧', desc: 'Diagnóstico e resolução de problemas em campo' },
                    { key: 'training', label: 'Treinamento',      icon: '🎓', desc: 'Aprendizado guiado e simulações técnicas' },
                  ].map(m => (
                    <button key={m.key} onClick={() => selectMode(m.key)}
                      style={{ ...S.modeCard, ...(mode === m.key ? S.modeCardActive : {}) }}>
                      <span style={{ fontSize: 22 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </ActiveStep>
            ) : null}

            {/* ETAPA 2 — Especialidade */}
            {currentStep > 2 && selected.specialty ? (
              <DoneRow label="Especialidade" summary={spSummary} onBack={() => goBackTo(2)} />
            ) : currentStep === 2 ? (
              <ActiveStep num={2} label="Especialidade">
                {loading ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</span>
                ) : (
                  <div style={S.chipGroup}>
                    {tree.map(s => (
                      <button key={s.id} onClick={() => selectSpecialty(s)}
                        style={{ ...S.chip, ...(selected.specialty?.id === s.id ? S.chipActive : {}) }}>
                        <span style={{ fontSize: 20 }}>{ICONS[s.slug] || '📋'}</span>
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </ActiveStep>
            ) : null}

            {/* ETAPA 3 — Tecnologia */}
            {currentStep > 3 && selected.technology ? (
              <DoneRow label="Tecnologia" summary={techSummary} onBack={() => goBackTo(3)} />
            ) : currentStep === 3 ? (
              <ActiveStep num={3} label="Tecnologia">
                <div style={S.chipGroup}>
                  {selected.specialty?.technologies?.map(t => (
                    <button key={t.id} onClick={() => selectTechnology(t)}
                      style={{ ...S.chip, ...(selected.technology?.id === t.id ? S.chipActive : {}), fontWeight: 700, letterSpacing: '0.03em' }}>
                      {t.frequency || t.name}
                    </button>
                  ))}
                </div>
              </ActiveStep>
            ) : null}

            {/* ETAPA 4 — Fabricante */}
            {currentStep > 4 && selected.manufacturer ? (
              <DoneRow label="Fabricante" summary={mfrSummary} onBack={() => goBackTo(4)} />
            ) : currentStep === 4 ? (
              <ActiveStep num={4} label="Fabricante">
                <div style={S.chipGroup}>
                  {selected.technology?.manufacturers?.map(m => (
                    <button key={m.id} onClick={() => selectManufacturer(m)}
                      style={{ ...S.chip, ...(selected.manufacturer?.id === m.id ? S.chipActive : {}) }}>
                      {m.name}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    📍 {[selected.specialty?.name, selected.technology?.name].filter(Boolean).join(' › ')}
                  </div>
                  <button className="btn btn-primary" onClick={startChat}
                    style={{ padding: '10px 22px', fontSize: 14 }}>
                    {MODE_ICONS[mode || 'support']} Iniciar sem fabricante
                  </button>
                </div>
              </ActiveStep>
            ) : null}

            {/* ETAPA 5 — Tipo de Equipamento (condicional) */}
            {showCategoryStep && currentStep > 5 && selected.category ? (
              <DoneRow label="Tipo de Equipamento" summary={catSummary} onBack={() => goBackTo(5)} />
            ) : showCategoryStep && currentStep === 5 ? (
              <ActiveStep num={5} label="Tipo de Equipamento">
                <div style={S.chipGroup}>
                  {categoriesWithModels.map(cat => (
                    <button key={cat.name} onClick={() => selectCategory(cat.name)}
                      style={{
                        ...S.chip,
                        ...(selected.category === cat.name ? S.chipActive : {}),
                        opacity: cat.models.length === 0 ? 0.55 : 1
                      }}>
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </ActiveStep>
            ) : null}

            {/* ETAPA 6 — Modelo + Iniciar */}
            {currentStep === 6 ? (
              <ActiveStep num={showCategoryStep ? 6 : 5} label="Modelo (opcional)">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 400 }}>
                  <input
                    type="text"
                    value={selected.model?.name || ''}
                    onChange={e => setSelected(p => ({
                      ...p,
                      model: e.target.value.trim() ? { name: e.target.value, id: null } : null
                    }))}
                    placeholder="Ex: Ultra 1.8, Ultra Post 6, ADS4..."
                    list="model-suggestions"
                    autoComplete="off"
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8,
                      border: `2px solid ${selected.model?.name ? 'var(--primary)' : 'var(--border)'}`,
                      background: 'var(--bg-secondary, var(--bg-card))',
                      color: 'var(--text)', fontSize: 14, outline: 'none'
                    }}
                  />
                  <datalist id="model-suggestions">
                    {modelsToShow.map(m => <option key={m.id} value={m.name} />)}
                  </datalist>
                  {selected.model?.name && (
                    <button onClick={() => setSelected(p => ({ ...p, model: null }))}
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>
                      ✕
                    </button>
                  )}
                </div>
                {modelsToShow.length > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                    Sugestões: {modelsToShow.map(m => m.name).join(', ')}
                  </p>
                )}

                {/* Botão Iniciar dentro da etapa final */}
                <div style={{ marginTop: 20 }}>
                  {selected.specialty && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>📍</span>
                      <span>{[selected.specialty?.name, selected.technology?.name, selected.manufacturer?.name, selected.category, selected.model?.name].filter(Boolean).join(' › ')}</span>
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={startChat}
                    style={{ padding: isMobile ? '15px' : '13px 32px', fontSize: 15, justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}>
                    {MODE_ICONS[mode || 'support']} Iniciar {mode === 'training' ? 'Treinamento' : 'Suporte'}
                  </button>
                </div>
              </ActiveStep>
            ) : null}


          </div>{/* fim wizard */}
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
  // Wizard
  wizard:       { display: 'flex', flexDirection: 'column', gap: 4 },
  // Etapa concluída (colapsada)
  doneRow:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'opacity 0.15s', opacity: 0.7 },
  doneCheck:    { width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneLabel:    { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  doneSummary:  { fontSize: 13, color: 'var(--primary)', fontWeight: 500, marginLeft: 4 },
  doneEdit:     { marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' },
  // Etapa ativa
  activeStep:   { background: 'var(--bg-card)', border: '1.5px solid var(--primary)', borderRadius: 12, padding: '18px 20px', marginTop: 8 },
  activeHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  activeNum:    { width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activeLabel:  { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  activeBody:   {},
  // Chips de seleção
  chipGroup:    { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip:         { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--bg-secondary, var(--bg-card))', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' },
  chipActive:   { borderColor: 'var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)' },
  badge:        { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' },
  // Modo cards (maior, com descrição)
  modeCard:     { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-secondary, var(--bg-card))', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', minWidth: 180 },
  modeCardActive: { borderColor: 'var(--primary)', background: 'var(--primary-light)' },
}
