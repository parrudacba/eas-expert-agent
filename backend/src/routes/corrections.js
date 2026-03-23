import { Router } from 'express'
import { requireTrainAgent, requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// POST /corrections - Salvar correção de resposta
router.post('/', requireTrainAgent, async (req, res) => {
  try {
    const { question, originalResponse, correctResponse } = req.body
    if (!question || !correctResponse) {
      return res.status(400).json({ error: 'question e correctResponse são obrigatórios' })
    }

    const { data, error } = await supabaseAdmin
      .from('agent_corrections')
      .insert({
        question,
        original_response: originalResponse || null,
        correct_response: correctResponse,
        created_by: req.user.id
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ correction: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /corrections - Listar correções (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_corrections')
      .select('*, profiles!created_by(full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ corrections: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /corrections/:id - Remover correção (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await supabaseAdmin
      .from('agent_corrections')
      .update({ is_active: false })
      .eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
