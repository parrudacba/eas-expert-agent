import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { agentService } from '../services/agentService.js'
import { supabaseAdmin } from '../config/supabase.js'
import { describePhoto } from './referencePhotos.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

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
        id, mode, channel, is_active, created_at, updated_at, name,
        specialty_id, technology_id, manufacturer_id, equipment_model_id,
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

// PATCH /chat/session/:id - Renomear sessão
router.patch('/session/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body

    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .update({ name: name?.trim() || null })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, name')
      .single()

    if (error) throw error
    res.json({ session: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /chat/session/:id/messages - Limpar mensagens (mantém a sessão)
router.delete('/session/:id/messages', requireAuth, async (req, res) => {
  try {
    // Verifica que a sessão pertence ao usuário
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' })

    await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('session_id', req.params.id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /chat/session/:id - Excluir sessão completamente
router.delete('/session/:id', requireAuth, async (req, res) => {
  try {
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()

    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' })

    await supabaseAdmin.from('chat_messages').delete().eq('session_id', req.params.id)
    await supabaseAdmin.from('chat_sessions').delete().eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /chat/analyze-photo — técnico envia foto para análise visual pelo agente
router.post('/analyze-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const { sessionId, message, manufacturerId, modelId, specialtyId } = req.body

    if (!req.file && !req.body.photoPath) {
      return res.status(400).json({ error: 'Foto obrigatória' })
    }

    // 1. Upload da foto do técnico para storage (se enviada diretamente)
    let photoBuffer, photoMime, photoPath
    if (req.file) {
      photoBuffer = req.file.buffer
      photoMime   = req.file.mimetype
      const fname = `${Date.now()}_field.jpg`
      photoPath   = `field-photos/${sessionId || 'nosession'}/${fname}`

      // Garante bucket chat-photos
      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      if (!buckets?.find(b => b.name === 'chat-photos')) {
        await supabaseAdmin.storage.createBucket('chat-photos', { public: false })
      }
      await supabaseAdmin.storage.from('chat-photos').upload(photoPath, photoBuffer, { contentType: photoMime, upsert: true })
    }

    // 2. Busca fotos de referência do contexto (até 3)
    let refPhotos = []
    try {
      let q = supabaseAdmin.from('reference_photos').select('file_url, title, description, content').eq('is_active', true).limit(3)
      if (modelId)       q = q.eq('equipment_model_id', modelId)
      else if (manufacturerId) q = q.eq('manufacturer_id', manufacturerId)
      else if (specialtyId)   q = q.eq('specialty_id', specialtyId)
      const { data } = await q
      refPhotos = data || []
    } catch { refPhotos = [] }

    // 3. Monta conteúdo para Claude Vision
    const imageContent = []

    // Foto do técnico
    if (photoBuffer) {
      const mediaType = photoMime?.includes('png') ? 'image/png' : 'image/jpeg'
      imageContent.push({ type: 'text', text: '--- FOTO ENVIADA PELO TÉCNICO EM CAMPO ---' })
      imageContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: photoBuffer.toString('base64') } })
    }

    // Fotos de referência com seus conteúdos (descrições) como contexto textual
    if (refPhotos.length > 0) {
      imageContent.push({ type: 'text', text: `\n--- FOTOS DE REFERÊNCIA DA BASE DE CONHECIMENTO (${refPhotos.length}) ---` })
      for (const ref of refPhotos) {
        imageContent.push({ type: 'text', text: `Referência: ${ref.title}${ref.description ? ' — ' + ref.description : ''}\nDescrição visual: ${ref.content || 'sem descrição'}` })
        // Tenta baixar a foto de referência para incluir visualmente
        try {
          const { data: fdata } = await supabaseAdmin.storage.from('reference-photos').download(ref.file_url)
          if (fdata) {
            const ab = await fdata.arrayBuffer()
            const b64 = Buffer.from(ab).toString('base64')
            imageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } })
          }
        } catch { /* skip — usa só a descrição textual */ }
      }
    }

    const userText = message?.trim() || 'Analise esta foto e me ajude a identificar o equipamento e qualquer problema visível.'
    imageContent.push({ type: 'text', text: `\n--- PERGUNTA DO TÉCNICO ---\n${userText}\n\nResponda em português com diagnóstico técnico preciso. Se identificar o equipamento, aponte qual ajuste, falha ou procedimento é necessário. Use as fotos de referência para comparar.` })

    // 4. Chama Claude Vision
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2024-10-22', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: imageContent }]
      })
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Erro na análise visual')
    }
    const visionData = await response.json()
    const analysis = visionData.content?.[0]?.text || 'Não foi possível analisar a foto.'

    // 5. Salva no histórico da sessão se houver sessionId
    if (sessionId) {
      await supabaseAdmin.from('chat_messages').insert([
        { session_id: sessionId, role: 'user',      content: `📷 Foto enviada${message ? ': ' + message : ''}`, metadata: { type: 'photo', photoPath } },
        { session_id: sessionId, role: 'assistant', content: analysis }
      ])
    }

    res.json({ response: analysis, photoPath, refCount: refPhotos.length })
  } catch (err) {
    console.error('Photo analysis error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router