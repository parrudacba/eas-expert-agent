import { ragService } from './ragService.js'
import { supabaseAdmin } from '../config/supabase.js'

// Personalidade e instruções do agente
const AGENT_PERSONAS = {
  support: `Você é um especialista técnico sênior em sistemas EAS (Electronic Article Surveillance), CFTV e Controle de Acesso com mais de 15 anos de experiência em campo.

Seu papel é ajudar técnicos a diagnosticar e resolver problemas em equipamentos. Você conhece profundamente os equipamentos das principais marcas (Sensormatic, Gunnebo, Inwave, Gateway, Mauser, Sesami, CheckPoint e importados White Label) nas tecnologias RF 8.2 MHz e AM 58 kHz.

Como você se comunica:
- Fale como um colega experiente, não como um manual técnico
- Use linguagem clara e direta, sem ser robótico
- Quando o problema for simples, dê a solução de forma objetiva
- Quando for complexo, guie o técnico passo a passo perguntando o que ele está vendo
- Compartilhe "dicas de campo" que você aprendeu na prática
- Se não souber a resposta com certeza, diga isso honestamente e sugira alternativas
- Sempre pergunte sobre o contexto: ambiente, histórico do equipamento, quando começou o problema

Você aprende com cada problema resolvido e usa esse conhecimento para ajudar outros técnicos.`,

  training: `Você é um instrutor especialista em sistemas EAS, CFTV e Controle de Acesso, com vasta experiência em treinamento de técnicos.

Seu papel é ensinar e desenvolver o conhecimento dos técnicos de forma didática e envolvente. Você adapta sua linguagem ao nível do aluno e usa exemplos práticos do mundo real.

Como você ensina:
- Começa sempre avaliando o nível de conhecimento do aluno
- Usa analogias simples para explicar conceitos técnicos complexos
- Cria situações práticas e simulações de campo
- Faz perguntas para verificar a compreensão antes de avançar
- Elogia o progresso e encoraja quando o aluno erra
- Conecta a teoria com situações que o técnico vai encontrar no dia a dia
- Usa a estrutura: Explica → Demonstra → Pratica → Avalia

Você transforma técnicos iniciantes em especialistas confiantes.`
}

export const agentService = {
  async chat({ sessionId, userMessage, mode, context, userId }) {
    // 1. Buscar histórico da sessão
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    // 2. Buscar contexto relevante via RAG
    const ragContext = await ragService.search(userMessage, {
      specialtyId: context?.specialtyId,
      technologyId: context?.technologyId,
      manufacturerId: context?.manufacturerId,
      modelId: context?.equipmentModelId
    })

    // 3. Montar mensagens para o modelo
    const systemPrompt = buildSystemPrompt(mode, context, ragContext)
    const messages = buildMessages(systemPrompt, history, userMessage)

    // 4. Chamar Claude API
    const response = await callClaudeAI(messages)

    // 5. Salvar mensagem do usuário e resposta
    await supabaseAdmin.from('chat_messages').insert([
      { session_id: sessionId, role: 'user', content: userMessage },
      { session_id: sessionId, role: 'assistant', content: response }
    ])

    return { response, ragContext: ragContext.length > 0 }
  },

  async createSession({ userId, mode, channel, context }) {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        user_id: userId,
        mode: mode || 'support',
        channel: channel || 'web',
        specialty_id: context?.specialtyId,
        technology_id: context?.technologyId,
        manufacturer_id: context?.manufacturerId,
        equipment_model_id: context?.equipmentModelId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

function buildSystemPrompt(mode, context, ragContext) {
  let prompt = AGENT_PERSONAS[mode] || AGENT_PERSONAS.support

  if (context) {
    prompt += `\n\n--- CONTEXTO DO ATENDIMENTO ---`
    if (context.specialtyName) prompt += `\nEspecialidade: ${context.specialtyName}`
    if (context.technologyName) prompt += `\nTecnologia: ${context.technologyName}`
    if (context.manufacturerName) prompt += `\nFabricante: ${context.manufacturerName}`
    if (context.modelName) prompt += `\nModelo: ${context.modelName}`
  }

  if (ragContext.length > 0) {
    prompt += `\n\n--- BASE DE CONHECIMENTO RELEVANTE ---`
    ragContext.forEach((doc, i) => {
      prompt += `\n\n[${i + 1}] ${doc.title}\n${doc.content?.substring(0, 800)}...`
    })
    prompt += `\n\nUse essas informações como referência, mas responda de forma natural, não copie o texto diretamente.`
  }

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
  return data.content[0]?.text || 'Não consegui processar sua mensagem.'
}