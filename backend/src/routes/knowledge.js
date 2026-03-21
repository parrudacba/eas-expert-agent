import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'
import { ragService } from '../services/ragService.js'

const router = Router()

// GET /knowledge/tree - Árvore completa de especialidades
router.get('/tree', requireAuth, async (req, res) => {
  try {
    const { data: specialties } = await supabaseAdmin
      .from('specialties')
      .select(`
        id, name, slug, icon,
        technologies (
          id, name, slug, frequency,
          manufacturers (
            id, name, slug,
            equipment_models (id, name, model_code)
          )
        )
      `)
      .eq('is_active', true)
      .order('name')

    res.json({ tree: specialties || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /knowledge/specialties - Listar especialidades
router.get('/specialties', requireAuth, async (req, res) => {
  const { data } = await supabaseAdmin.from('specialties').select('*').eq('is_active', true)
  res.json({ specialties: data || [] })
})

// GET /knowledge/technologies?specialtyId= - Tecnologias por especialidade
router.get('/technologies', requireAuth, async (req, res) => {
  const query = supabaseAdmin.from('technologies').select('*').eq('is_active', true)
  if (req.query.specialtyId) query.eq('specialty_id', req.query.specialtyId)
  const { data } = await query.order('name')
  res.json({ technologies: data || [] })
})

// GET /knowledge/manufacturers?technologyId= - Fabricantes por tecnologia
router.get('/manufacturers', requireAuth, async (req, res) => {
  const query = supabaseAdmin.from('manufacturers').select('*').eq('is_active', true)
  if (req.query.technologyId) query.eq('technology_id', req.query.technologyId)
  const { data } = await query.order('name')
  res.json({ manufacturers: data || [] })
})

// GET /knowledge/models?manufacturerId= - Modelos por fabricante
router.get('/models', requireAuth, async (req, res) => {
  const query = supabaseAdmin.from('equipment_models').select('*').eq('is_active', true)
  if (req.query.manufacturerId) query.eq('manufacturer_id', req.query.manufacturerId)
  const { data } = await query.order('name')
  res.json({ models: data || [] })
})

// POST /knowledge/documents - Upload de documento (admin)
router.post('/documents', requireAdmin, async (req, res) => {
  try {
    const {
      title, type, content, file_url,
      specialtyId, technologyId, manufacturerId, equipmentModelId
    } = req.body

    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .insert({
        title, type, content, file_url,
        specialty_id: specialtyId,
        technology_id: technologyId,
        manufacturer_id: manufacturerId,
        equipment_model_id: equipmentModelId,
        created_by: req.user.id
      })
      .select()
      .single()

    if (error) throw error

    // Indexar para RAG em background
    ragService.indexDocument(doc.id).catch(console.error)

    res.status(201).json({ document: doc })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /knowledge/models - Adicionar modelo de equipamento (admin)
router.post('/models', requireAdmin, async (req, res) => {
  try {
    const { name, modelCode, manufacturerId, description, specifications } = req.body

    const { data, error } = await supabaseAdmin
      .from('equipment_models')
      .insert({
        name,
        model_code: modelCode,
        manufacturer_id: manufacturerId,
        description,
        specifications: specifications || {}
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ model: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /knowledge/field-issues - Registrar problema de campo
router.post('/field-issues', requireAuth, async (req, res) => {
  try {
    const {
      title, description, symptoms, environmentContext,
      specialtyId, technologyId, manufacturerId, equipmentModelId
    } = req.body

    const { data: issue, error } = await supabaseAdmin
      .from('field_issues')
      .insert({
        title, description,
        symptoms: symptoms || [],
        environment_context: environmentContext,
        specialty_id: specialtyId,
        technology_id: technologyId,
        manufacturer_id: manufacturerId,
        equipment_model_id: equipmentModelId,
        reported_by: req.user.id
      })
      .select()
      .single()

    if (error) throw error

    // Indexar para RAG
    ragService.indexFieldIssue(issue.id).catch(console.error)

    res.status(201).json({ issue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /knowledge/field-issues/:id/solution - Adicionar solução
router.post('/field-issues/:id/solution', requireAuth, async (req, res) => {
  try {
    const { solution, steps, toolsNeeded } = req.body

    const { data, error } = await supabaseAdmin
      .from('issue_solutions')
      .insert({
        field_issue_id: req.params.id,
        solution,
        steps: steps || [],
        tools_needed: toolsNeeded || [],
        created_by: req.user.id
      })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ solution: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /knowledge/field-issues/:id/solution/:solutionId/approve - Aprovar solução (admin)
router.patch('/field-issues/:id/solution/:solutionId/approve', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('issue_solutions')
      .update({ is_approved: true, approved_by: req.user.id, approved_at: new Date().toISOString() })
      .eq('id', req.params.solutionId)
      .select()
      .single()

    if (error) throw error

    // Atualizar status do issue
    await supabaseAdmin
      .from('field_issues')
      .update({ status: 'validated', resolved_by: req.user.id })
      .eq('id', req.params.id)

    res.json({ solution: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router