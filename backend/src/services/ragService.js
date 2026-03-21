import { supabaseAdmin } from '../config/supabase.js'
import { abacusFetch } from '../config/abacus.js'

export const ragService = {
  // Busca semântica na base de conhecimento
  async search(query, filters = {}) {
    if (!query) return []

    try {
      // Gerar embedding da query via Abacus.ai
      const embedding = await generateEmbedding(query)

      // Buscar documentos relevantes
      const { data: docs } = await supabaseAdmin.rpc('search_documents', {
        query_embedding: embedding,
        match_threshold: 0.65,
        match_count: 5,
        filter_specialty_id: filters.specialtyId || null,
        filter_technology_id: filters.technologyId || null,
        filter_manufacturer_id: filters.manufacturerId || null,
        filter_model_id: filters.modelId || null
      })

      // Buscar issues de campo similares
      const { data: issues } = await supabaseAdmin.rpc('search_field_issues', {
        query_embedding: embedding,
        match_threshold: 0.65,
        match_count: 3,
        filter_technology_id: filters.technologyId || null
      })

      return [...(docs || []), ...(issues || [])]
    } catch (err) {
      console.error('RAG search error:', err.message)
      return []
    }
  },

  // Indexar documento com embedding
  async indexDocument(documentId) {
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('id, title, content')
      .eq('id', documentId)
      .single()

    if (!doc?.content) return false

    const textToEmbed = `${doc.title}\n\n${doc.content}`
    const embedding = await generateEmbedding(textToEmbed)

    await supabaseAdmin
      .from('documents')
      .update({ embedding })
      .eq('id', documentId)

    return true
  },

  // Indexar field issue com embedding
  async indexFieldIssue(issueId) {
    const { data: issue } = await supabaseAdmin
      .from('field_issues')
      .select('id, title, description, symptoms')
      .eq('id', issueId)
      .single()

    if (!issue) return false

    const textToEmbed = [
      issue.title,
      issue.description,
      ...(issue.symptoms || [])
    ].join('\n')

    const embedding = await generateEmbedding(textToEmbed)

    await supabaseAdmin
      .from('field_issues')
      .update({ embedding })
      .eq('id', issueId)

    return true
  }
}

async function generateEmbedding(text) {
  const data = await abacusFetch('/v0/embeddings', {
    method: 'POST',
    body: JSON.stringify({ text, modelName: 'text-embedding-3-small' })
  })
  return data.embedding
}