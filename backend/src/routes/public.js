import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// POST /public/access-request — público, sem autenticação
router.post('/access-request', async (req, res) => {
  try {
    const { name, email, phone, company, position, reason } = req.body

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Nome, email e telefone são obrigatórios.' })
    }

    // Verificar se já existe uma solicitação pendente para esse email
    const { data: existing } = await supabaseAdmin
      .from('access_requests')
      .select('id, status')
      .eq('email', email.trim().toLowerCase())
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existing?.status === 'approved') {
      return res.status(409).json({ error: 'Este email já tem acesso aprovado. Use a aba Entrar.' })
    }
    if (existing?.status === 'pending') {
      return res.status(409).json({ error: 'Já existe uma solicitação pendente para este email.' })
    }

    const { data, error } = await supabaseAdmin
      .from('access_requests')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        reason: [
          phone ? `Telefone: ${phone.trim()}` : null,
          company ? `Empresa: ${company.trim()}` : null,
          position ? `Cargo: ${position.trim()}` : null,
          reason ? `Motivo: ${reason.trim()}` : null
        ].filter(Boolean).join(' | '),
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, id: data.id })
  } catch (err) {
    console.error('access-request error:', err)
    res.status(500).json({ error: err.message || 'Erro ao enviar solicitação.' })
  }
})

export default router