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

// PATCH /admin/users/:id - Atualizar perfil/role de usuário
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { role, whatsappAuthorized, fullName } = req.body
    const updates = {}
    if (role) updates.role = role
    if (whatsappAuthorized !== undefined) updates.whatsapp_authorized = whatsappAuthorized
    if (fullName) updates.full_name = fullName

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

export default router