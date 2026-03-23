import { ragService } from './ragService.js'
import { supabaseAdmin } from '../config/supabase.js'

// ─── Resposta padrão quando não há documentos ─────────────────────────────────
const SEM_CONTEXTO =
  'Não encontrei informações sobre isso na base de conhecimento. ' +
  'Consulte o administrador para adicionar documentos relacionados a esse assunto.'

// ─── Prompt de sistema hermético ──────────────────────────────────────────────
function buildSystemPrompt(mode, context, ragContext, corrections = []) {
  const modeLabel = mode === 'training' ? 'treinamento' : 'suporte técnico'

  let prompt = `Você é o EAS Expert, assistente técnico exclusivo da Sensorseg para ${modeLabel}.

═══════════════════════════════════════════════════
REGRAS ABSOLUTAS — NUNCA QUEBRE ESTAS REGRAS:
═══════════════════════════════════════════════════
1. Responda SOMENTE com base nas informações da seção "BASE DE CONHECIMENTO" abaixo.
2. NUNCA use conhecimento externo, conhecimento geral, memória de treinamento ou suposições.
3. NUNCA invente especificações, valores de tensão, frequências, procedimentos ou qualquer dado técnico.
4. Se a informação não estiver na base de conhecimento, responda EXATAMENTE:
   "Não encontrei essa informação na base de conhecimento. Consulte o administrador."
5. Não cite fontes externas, não faça referências a normas ou fabricantes além do que está na base.
6. Você é uma caixa fechada: só existe o que está na base de conhecimento abaixo.
═══════════════════════════════════════════════════`

  if (context) {
    prompt += `\n\n--- CONTEXTO DO ATENDIMENTO ---`
    if (context.specialtyName)    prompt += `\nEspecialidade: ${context.specialtyName}`
    if (context.technologyName)   prompt += `\nTecnologia: ${context.technologyName}`
    if (context.manufacturerName) prompt += `\nFabricante: ${context.manufacturerName}`
    if (context.modelName)        prompt += `\nModelo: ${context.modelName}`
  }

  if (corrections.length > 0) {
    prompt += `\n\n--- CORREÇÕES VALIDADAS (PRIORIDADE MÁXIMA) ---`
    prompt += `\nEstas respostas foram corrigidas e validadas por administradores. Use-as como resposta definitiva:`
    corrections.forEach((c, i) => {
      prompt += `\n\n[Correção ${i + 1}]\nPergunta: ${c.question}\nResposta correta: ${c.correct_response}`
    })
    prompt += `\n\n--- FIM DAS CORREÇÕES ---`
  }

  prompt += `\n\n--- BASE DE CONHECIMENTO ---`
  ragContext.forEach((doc, i) => {
    prompt += `\n\n[Documento ${i + 1}] ${doc.title}\n${doc.content?.substring(0, 1200)}`
  })
  prompt += `\n\n--- FIM DA BASE DE CONHECIMENTO ---`
  prompt += `\n\nResponda APENAS com base nas correções validadas e documentos acima. Se a resposta não estiver lá, diga que não encontrou.`

  return prompt
}

function buildMessages(systemPrompt, history, userMessage) {
  return [
    { role: 'system', content: systemPrompt },
    ...(history || []).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ]
}

async function callClaudeAI(messages) {
  const system = messages.find(m => m.role === 'system')?.content || ''
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: chatMessages
    })
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  return data.content[0]?.text || SEM_CONTEXTO
}

// ─── Serviço principal ────────────────────────────────────────────────────────
export const agentService = {
  async chat({ sessionId, userMessage, mode, context }) {
    // 1. Buscar histórico da sessão
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    // 2. Buscar correções validadas por admins (prioridade máxima)
    const keywords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const { data: allCorrections } = await supabaseAdmin
      .from('agent_corrections')
      .select('question, correct_response')
      .eq('is_active', true)
    const corrections = (allCorrections || []).filter(c =>
      keywords.some(w => c.question.toLowerCase().includes(w))
    )

    // 3. Buscar contexto via RAG (busca por palavras-chave na base)
    const ragContext = await ragService.search(userMessage, {
      specialtyId:    context?.specialtyId,
      technologyId:   context?.technologyId,
      manufacturerId: context?.manufacturerId,
      modelId:        context?.equipmentModelId
    })

    // 4. BLOQUEIO: sem documentos nem correções → recusa responder
    if (ragContext.length === 0 && corrections.length === 0) {
      await supabaseAdmin.from('chat_messages').insert([
        { session_id: sessionId, role: 'user',      content: userMessage },
        { session_id: sessionId, role: 'assistant', content: SEM_CONTEXTO }
      ])
      return { response: SEM_CONTEXTO, ragContext: false }
    }

    // 5. Montar prompt hermético com documentos e correções validadas
    const systemPrompt = buildSystemPrompt(mode, context, ragContext, corrections)
    const messages = buildMessages(systemPrompt, history, userMessage)

    // 5. Chamar Claude com contexto restrito
    const response = await callClaudeAI(messages)

    // 6. Salvar conversa
    await supabaseAdmin.from('chat_messages').insert([
      { session_id: sessionId, role: 'user',      content: userMessage },
      { session_id: sessionId, role: 'assistant', content: response }
    ])

    return { response, ragContext: true }
  },

  async createSession({ userId, mode, channel, context }) {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        user_id:            userId,
        mode:               mode || 'support',
        channel:            channel || 'web',
        specialty_id:       context?.specialtyId,
        technology_id:      context?.technologyId,
        manufacturer_id:    context?.manufacturerId,
        equipment_model_id: context?.equipmentModelId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}