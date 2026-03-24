import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// GET /admin/dashboard - Resumo geral
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: totalDocs },
      { count: openIssues },
      { count: totalSessions }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('documents').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('field_issues').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabaseAdmin.from('chat_sessions').select('*', { count: 'exact', head: true })
    ])

    res.json({ totalUsers, totalDocs, openIssues, totalSessions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /admin/users - Listar usuários
router.get('/users', requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, phone, whatsapp_number, whatsapp_authorized, created_at')
    .order('created_at', { ascending: false })
  res.json({ users: data || [] })
})

// POST /admin/users - Criar novo usuário
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role, permissions } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' }
    })
    if (authError) throw authError

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user.id, full_name: fullName || '', role: role || 'technician', permissions: permissions || {} })
      .select()
      .single()

    if (profileError) throw profileError
    res.status(201).json({ user: { ...user, profile } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /admin/users/:id - Atualizar perfil/role de usuário
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { role, whatsappAuthorized, fullName, permissions } = req.body
    const updates = {}
    if (role) updates.role = role
    if (whatsappAuthorized !== undefined) updates.whatsapp_authorized = whatsappAuthorized
    if (fullName) updates.full_name = fullName
    if (permissions !== undefined) updates.permissions = permissions

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json({ user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /admin/field-issues - Problemas pendentes de aprovação
router.get('/field-issues', requireAdmin, async (req, res) => {
  const { status } = req.query
  const query = supabaseAdmin
    .from('field_issues')
    .select(`
      id, title, description, symptoms, status, created_at,
      equipment_models(name),
      manufacturers(name),
      technologies(name),
      specialties(name),
      profiles!reported_by(full_name),
      issue_solutions(id, solution, is_approved)
    `)
    .order('created_at', { ascending: false })

  if (status) query.eq('status', status)

  const { data } = await query
  res.json({ issues: data || [] })
})

// GET /admin/whatsapp-users - Usuários autorizados WhatsApp
router.get('/whatsapp-users', requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('authorized_whatsapp_users')
    .select('*')
    .order('created_at', { ascending: false })
  res.json({ users: data || [] })
})

// POST /admin/whatsapp-users - Autorizar número WhatsApp
router.post('/whatsapp-users', requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, name, userId } = req.body
    const { data, error } = await supabaseAdmin
      .from('authorized_whatsapp_users')
      .insert({ phone_number: phoneNumber, name, user_id: userId, authorized_by: req.user.id })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ user: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /admin/whatsapp-users/:id - Revogar acesso WhatsApp
router.delete('/whatsapp-users/:id', requireAdmin, async (req, res) => {
  await supabaseAdmin.from('authorized_whatsapp_users').update({ is_active: false }).eq('id', req.params.id)
  res.json({ success: true })
})

// ── ACCESS REQUESTS ──────────────────────────────────────────

// GET /admin/access-requests
router.get('/access-requests', requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin.from('access_requests').select('*').order('created_at', { ascending: false })
  res.json({ requests: data || [] })
})

// PATCH /admin/access-requests/:id - Aprovar ou rejeitar
router.patch('/access-requests/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body
    const { data, error } = await supabaseAdmin
      .from('access_requests')
      .update({ status, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json({ request: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /admin/access-requests/:id
router.delete('/access-requests/:id', requireAdmin, async (req, res) => {
  await supabaseAdmin.from('access_requests').delete().eq('id', req.params.id)
  res.json({ success: true })
})

// ── AUTHORIZED EMAILS ─────────────────────────────────────────

// GET /admin/authorized-emails
router.get('/authorized-emails', requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin.from('authorized_emails').select('*').order('created_at', { ascending: false })
  res.json({ emails: data || [] })
})

// POST /admin/authorized-emails
router.post('/authorized-emails', requireAdmin, async (req, res) => {
  try {
    const { email, name } = req.body
    const { data, error } = await supabaseAdmin
      .from('authorized_emails')
      .insert({ email, name, added_by: req.user.id })
      .select().single()
    if (error) throw error
    res.status(201).json({ email: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /admin/authorized-emails/:id
router.delete('/authorized-emails/:id', requireAdmin, async (req, res) => {
  await supabaseAdmin.from('authorized_emails').update({ is_active: false }).eq('id', req.params.id)
  res.json({ success: true })
})

// POST /admin/cleanup — limpa dados órfãos / is_active=false do banco
router.post('/cleanup', requireAdmin, async (req, res) => {
  const log = []
  let errors = 0

  try {
    // 1. Documentos soft-deleted (is_active = false) → hard-delete com limpeza de storage
    const { data: deadDocs } = await supabaseAdmin
      .from('documents')
      .select('id, file_url')
      .eq('is_active', false)

    if (deadDocs?.length) {
      // Remove arquivos do storage em batch
      const filePaths = deadDocs.map(d => d.file_url).filter(Boolean)
      if (filePaths.length) {
        const { error: storageErr } = await supabaseAdmin.storage.from('documents').remove(filePaths)
        if (storageErr) log.push(`⚠️ Storage parcial: ${storageErr.message}`)
      }
      // Hard-delete das linhas
      await supabaseAdmin.from('documents').delete().eq('is_active', false)
      log.push(`🗑️ ${deadDocs.length} documento(s) soft-deleted removidos do banco e storage`)
    } else {
      log.push('✅ Nenhum documento soft-deleted encontrado')
    }

    // 2. Sessões de chat sem nenhuma mensagem e criadas há mais de 24h (órfãs)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: emptySessions } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .lt('created_at', oneDayAgo)

    if (emptySessions?.length) {
      // Filtra apenas as que não têm mensagens
      const ids = emptySessions.map(s => s.id)
      const { data: withMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('session_id')
        .in('session_id', ids)
      const withMsgIds = new Set((withMessages || []).map(m => m.session_id))
      const orphanIds = ids.filter(id => !withMsgIds.has(id))

      if (orphanIds.length) {
        await supabaseAdmin.from('chat_sessions').delete().in('id', orphanIds)
        log.push(`🗑️ ${orphanIds.length} sessão(ões) vazia(s) removida(s)`)
      } else {
        log.push('✅ Nenhuma sessão órfã encontrada')
      }
    } else {
      log.push('✅ Nenhuma sessão antiga encontrada')
    }

    // 3. Correções de agente vinculadas a documentos inexistentes
    const { data: corrections } = await supabaseAdmin
      .from('agent_corrections')
      .select('id, document_id')
      .not('document_id', 'is', null)

    if (corrections?.length) {
      const docIds = [...new Set(corrections.map(c => c.document_id).filter(Boolean))]
      const { data: existingDocs } = await supabaseAdmin
        .from('documents')
        .select('id')
        .in('id', docIds)
      const existingIds = new Set((existingDocs || []).map(d => d.id))
      const orphanCorrIds = corrections.filter(c => !existingIds.has(c.document_id)).map(c => c.id)

      if (orphanCorrIds.length) {
        await supabaseAdmin.from('agent_corrections').delete().in('id', orphanCorrIds)
        log.push(`🗑️ ${orphanCorrIds.length} correção(ões) órfã(s) removida(s)`)
      } else {
        log.push('✅ Nenhuma correção órfã encontrada')
      }
    }

    res.json({ success: true, log, errors })
  } catch (err) {
    console.error('Cleanup error:', err)
    res.status(500).json({ error: err.message, log })
  }
})

export default router