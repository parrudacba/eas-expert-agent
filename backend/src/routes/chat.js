import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { agentService } from '../services/agentService.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

// POST /chat/session - Criar nova sessão
router.post('/session', requireAuth, async (req, res) => {
  try {
    const { mode, channel, context } = req.body
    const session = await agentService.createSession({
      userId: req.user.id,
      mode,
      channel,
      context
    })
    res.json({ session })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /chat/message - Enviar mensagem
router.post('/message', requireAuth, async (req, res) => {
  try {
    const { sessionId, message, context } = req.body

    if (!sessionId || !message?.trim()) {
      return res.status(400).json({ error: 'sessionId e message são obrigatórios' })
    }

    // Verificar que a sessão pertence ao usuário
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, mode, specialty_id, technology_id, manufacturer_id, equipment_model_id')
      .eq('id', sessionId)
      .eq('user_id', req.user.id)
      .single()

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' })
    }

    const result = await agentService.chat({
      sessionId,
      userMessage: message.trim(),
      mode: session.mode,
      context: context || {
        specialtyId: session.specialty_id,
        technologyId: session.technology_id,
        manufacturerId: session.manufacturer_id,
        equipmentModelId: session.equipment_model_id
      },
      userId: req.user.id
    })

    res.json(result)
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: err.message || 'Erro ao processar mensagem' })
  }
})

// GET /chat/session/:id/history - Histórico de uma sessão
router.get('/session/:id/history', requireAuth, async (req, res) => {
  try {
    const { data: messages } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: true })

    res.json({ messages: messages || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /chat/sessions - Listar sessões do usuário
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { data: sessions } = await supabaseAdmin
      .from('chat_sessions')
      .select(`
        id, mode, channel, is_active, created_at, updated_at,
        specialties(name),
        technologies(name),
        manufacturers(name),
        equipment_models(name)
      `)
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    res.json({ sessions: sessions || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router