import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'
import { ragService } from '../services/ragService.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

// Extrair texto de arquivos
async function extractText(buffer, mimetype, originalname) {
  if (mimetype === 'text/plain') {
    return buffer.toString('utf-8')
  }
  if (mimetype === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
      const data = await pdfParse(buffer)
      return data.text
    } catch {
      return `[PDF: ${originalname} - conteúdo não extraído automaticamente]`
    }
  }
  if (mimetype.includes('wordprocessingml') || mimetype.includes('docx')) {
    // DOCX: extrair texto simples dos bytes XML internos
    try {
      const text = buffer.toString('latin1')
      const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').substring(0, 50000)
    } catch {
      return `[DOCX: ${originalname} - conteúdo não extraído automaticamente]`
    }
  }
  return ''
}

// POST /documents/upload - Upload de arquivo com categorização
router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' })

    const {
      title, type,
      specialtyId, technologyId, manufacturerId, equipmentModelId
    } = req.body

    if (!title) return res.status(400).json({ error: 'Título obrigatório' })

    const file = req.file
    const fileExt = file.originalname.split('.').pop().toLowerCase()
    const fileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = `documents/${fileName}`

    // 1. Upload para Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false })

    if (storageError) throw new Error(`Storage: ${storageError.message}`)

    // 2. URL do arquivo (salva via filePath, URL assinada gerada sob demanda)
    supabaseAdmin.storage.from('documents').getPublicUrl(filePath)

    // 3. Extrair texto para RAG (limitado a 200KB para evitar timeout)
    const rawContent = await extractText(file.buffer, file.mimetype, file.originalname)
    const content = rawContent.substring(0, 200000)

    // 4. Salvar metadados no banco
    const { data: doc, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: title || file.originalname,
        type: type || 'manual',
        content,
        file_url: filePath,
        specialty_id: specialtyId || null,
        technology_id: technologyId || null,
        manufacturer_id: manufacturerId || null,
        equipment_model_id: equipmentModelId || null,
        metadata: { original_name: file.originalname, mime_type: file.mimetype, size: file.size, ext: fileExt },
        created_by: req.user.id
      })
      .select()
      .single()

    if (dbError) throw new Error(`DB: ${dbError.message}`)

    // 5. Indexar para RAG em background
    if (content) ragService.indexDocument(doc.id).catch(console.error)

    res.status(201).json({ document: doc, extracted: content.length > 0 })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /documents/process - Processar arquivo já enviado ao Supabase Storage
router.post('/process', requireAdmin, async (req, res) => {
  try {
    const { filePath, title, type, specialtyId, technologyId, manufacturerId, equipmentModelId } = req.body
    if (!filePath || !title) return res.status(400).json({ error: 'filePath e title são obrigatórios' })

    // 1. Baixar arquivo do Supabase Storage (server-to-server, sem limite de 6MB)
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(filePath)

    if (downloadError) throw new Error(`Download storage: ${downloadError.message}`)

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. Detectar tipo pelo path
    const ext = filePath.split('.').pop().toLowerCase()
    const mimeMap = {
      pdf:  'application/pdf',
      txt:  'text/plain',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    const mimetype = mimeMap[ext] || 'application/octet-stream'

    // 3. Extrair texto com timeout de 20s (se falhar, salva com placeholder)
    const content = await Promise.race([
      extractText(buffer, mimetype, filePath),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000))
    ])
      .then(text => text.substring(0, 200000))
      .catch(() => `[Documento: ${title} — conteúdo será indexado manualmente]`)

    // 4. Salvar no banco
    const { data: doc, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        title, type: type || 'manual', content, file_url: filePath,
        specialty_id:       specialtyId       || null,
        technology_id:      technologyId      || null,
        manufacturer_id:    manufacturerId    || null,
        equipment_model_id: equipmentModelId  || null,
        metadata: { ext, size: buffer.length },
        created_by: req.user.id
      })
      .select()
      .single()

    if (dbError) throw new Error(`DB: ${dbError.message}`)

    res.status(201).json({ document: doc, extracted: content.length > 0 })
  } catch (err) {
    console.error('Process error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /documents - Listar documentos com filtros
router.get('/', requireAuth, async (req, res) => {
  try {
    const { specialtyId, technologyId, manufacturerId, modelId, type } = req.query
    let query = supabaseAdmin
      .from('documents')
      .select(`
        id, title, type, file_url, created_at, metadata,
        specialties(id, name, slug),
        technologies(id, name, slug),
        manufacturers(id, name),
        equipment_models(id, name, model_code)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (specialtyId) query = query.eq('specialty_id', specialtyId)
    if (technologyId) query = query.eq('technology_id', technologyId)
    if (manufacturerId) query = query.eq('manufacturer_id', manufacturerId)
    if (modelId) query = query.eq('equipment_model_id', modelId)
    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error
    res.json({ documents: data || [], total: data?.length || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /documents/:id/url - URL assinada para download
router.get('/:id/url', requireAuth, async (req, res) => {
  try {
    const { data: doc } = await supabaseAdmin.from('documents').select('file_url').eq('id', req.params.id).single()
    if (!doc?.file_url) return res.status(404).json({ error: 'Documento não encontrado' })

    const { data, error } = await supabaseAdmin.storage.from('documents').createSignedUrl(doc.file_url, 3600)
    if (error) throw error
    res.json({ url: data.signedUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /documents/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { data: doc } = await supabaseAdmin.from('documents').select('file_url').eq('id', req.params.id).single()
    if (doc?.file_url) {
      await supabaseAdmin.storage.from('documents').remove([doc.file_url])
    }
    await supabaseAdmin.from('documents').update({ is_active: false }).eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
