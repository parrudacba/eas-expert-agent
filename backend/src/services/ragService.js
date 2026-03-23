import { supabaseAdmin } from '../config/supabase.js'

export const ragService = {
  // Busca por palavras-chave na base de conhecimento (sem embedding externo)
  async search(query, filters = {}) {
    if (!query) return []

    try {
      // Extrair palavras-chave com 3+ caracteres
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\sáéíóúãõâêîôûàèìòùç]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3)

      if (keywords.length === 0) return []

      // Montar query no Supabase
      let dbQuery = supabaseAdmin
        .from('documents')
        .select('id, title, content, document_type')
        .eq('status', 'active')

      // Aplicar filtros de contexto
      if (filters.specialtyId)    dbQuery = dbQuery.eq('specialty_id', filters.specialtyId)
      if (filters.technologyId)   dbQuery = dbQuery.eq('technology_id', filters.technologyId)
      if (filters.manufacturerId) dbQuery = dbQuery.eq('manufacturer_id', filters.manufacturerId)
      if (filters.modelId)        dbQuery = dbQuery.eq('equipment_model_id', filters.modelId)

      // Busca por palavras-chave em título e conteúdo
      const orConditions = keywords
        .flatMap(k => [`title.ilike.%${k}%`, `content.ilike.%${k}%`])
        .join(',')

      dbQuery = dbQuery.or(orConditions).limit(5)

      const { data: docs, error } = await dbQuery

      if (error) {
        console.error('RAG DB error:', error.message)
        return []
      }

      return (docs || []).map(doc => ({
        title: doc.title,
        content: doc.content,
        type: doc.document_type
      }))
    } catch (err) {
      console.error('RAG search error:', err.message)
      return []
    }
  },

  // Mantido para compatibilidade — sem embedding externo
  async indexDocument() { return true },
  async indexFieldIssue() { return true }
}