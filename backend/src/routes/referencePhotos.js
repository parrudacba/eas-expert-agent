import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { requireTrainAgent } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// ── Garante que o bucket existe ───────────────────────────────────────────────
async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (!buckets?.find(b => b.name === 'reference-photos')) {
    await supabaseAdmin.storage.createBucket('reference-photos', { public: false })
  }
}

// ── Analisa foto com Claude Vision e gera descrição ──────────────────────────
async function describePhoto(buffer, mimetype, context = '') {
  if (!process.env.ANTHROPIC_API_KEY) return ''
  try {
    const base64 = buffer.toString('base64')
    const mediaType = mimetype.includes('png') ? 'image/png' : mimetype.includes('gif') ? 'image/gif' : 'image/jpeg'
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2024-10-22', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `Você é um especialista em equipamentos de segurança eletrônica (EAS, CFTV, Controle de Acesso).${context ? `\nContexto: ${context}` : ''}\n\nDescreva detalhadamente esta foto de referência técnica:\n1. Identifique o equipamento, marca e modelo se visível\n2. Descreva todos os componentes, conectores, LEDs, botões, jumpers, DIP switches visíveis\n3. Descreva posição e rótulos de cada elemento\n4. Identifique o estado do equipamento (normal, com falha, em instalação, etc.)\n5. Anote qualquer informação técnica relevante visível\n\nSeja extremamente detalhado — esta descrição será usada para identificar equipamentos em campo.` }
          ]
        }]
      })
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.content?.[0]?.text || ''
  } catch { return '' }
}

// GET /reference-photos — lista fotos com filtros
router.get('/', requireAuth, async (req, res) => {
  try {
    const { manufacturerId, modelId, specialtyId } = req.query
    let q = supabaseAdmin.from('reference_photos')
      .select('id, title, description, file_url, content, specialty_id, technology_id, manufacturer_id, equipment_model_id, created_at, specialties(name), technologies(name), manufacturers(name), equipment_models(name,model_code)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (manufacturerId) q = q.eq('manufacturer_id', manufacturerId)
    if (modelId)        q = q.eq('equipment_model_id', modelId)
    if (specialtyId)    q = q.eq('specialty_id', specialtyId)

    const { data, error } = await q
    if (error) throw error
    res.json({ photos: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /reference-photos/upload — upload de foto de referência (train_agent)
router.post('/upload', requireTrainAgent, upload.single('photo'), async (req, res) => {
  try {
    await ensureBucket()
    if (!req.file) return res.status(400).json({ error: 'Foto não enviada' })
    const { title, description, specialtyId, technologyId, manufacturerId, equipmentModelId } = req.body
    if (!title) return res.status(400).json({ error: 'Título obrigatório' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = `${fileName}`

    const { error: storageErr } = await supabaseAdmin.storage
      .from('reference-photos')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false })
    if (storageErr) throw new Error(`Storage: ${storageErr.message}`)

    // Gera descrição visual com Claude Vision
    const contextParts = [manufacturerId && 'fabricante informado', equipmentModelId && 'modelo informado'].filter(Boolean).join(', ')
    const content = await describePhoto(req.file.buffer, req.file.mimetype, contextParts)

    const { data: photo, error: dbErr } = await supabaseAdmin.from('reference_photos').insert({
      title, description: description || null, file_url: filePath, content,
      specialty_id: specialtyId || null, technology_id: technologyId || null,
      manufacturer_id: manufacturerId || null, equipment_model_id: equipmentModelId || null,
      metadata: { ext, size: req.file.size }, created_by: req.user.id
    }).select().single()
    if (dbErr) throw new Error(`DB: ${dbErr.message}`)

    res.status(201).json({ photo })
  } catch (err) {
    console.error('Reference photo upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /reference-photos/:id/url — URL assinada para visualização
router.get('/:id/url', requireAuth, async (req, res) => {
  try {
    const { data: photo } = await supabaseAdmin.from('reference_photos').select('file_url').eq('id', req.params.id).single()
    if (!photo?.file_url) return res.status(404).json({ error: 'Foto não encontrada' })
    const { data, error } = await supabaseAdmin.storage.from('reference-photos').createSignedUrl(photo.file_url, 3600)
    if (error) throw error
    res.json({ url: data.signedUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /reference-photos/:id — remove foto (train_agent)
router.delete('/:id', requireTrainAgent, async (req, res) => {
  try {
    const { data: photo } = await supabaseAdmin.from('reference_photos').select('file_url').eq('id', req.params.id).single()
    if (photo?.file_url) await supabaseAdmin.storage.from('reference-photos').remove([photo.file_url])
    await supabaseAdmin.from('reference_photos').update({ is_active: false }).eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
export { describePhoto }
