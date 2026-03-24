import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Erro na requisição')
  }
  return res.json()
}

export const api = {
  // Knowledge tree
  getTree: () => request('/knowledge/tree'),
  getTechnologies: (specialtyId) => request(`/knowledge/technologies?specialtyId=${specialtyId}`),
  getManufacturers: (technologyId) => request(`/knowledge/manufacturers?technologyId=${technologyId}`),
  getModels: (manufacturerId) => request(`/knowledge/models?manufacturerId=${manufacturerId}`),

  // Chat
  createSession: (body) => request('/chat/session', { method: 'POST', body: JSON.stringify(body) }),
  sendMessage: (body) => request('/chat/message', { method: 'POST', body: JSON.stringify(body) }),
  getHistory: (sessionId) => request(`/chat/session/${sessionId}/history`),
  getSessions: () => request('/chat/sessions'),
  renameSession: (id, name) => request(`/chat/session/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  clearSession: (id) => request(`/chat/session/${id}/messages`, { method: 'DELETE' }),
  deleteSession: (id) => request(`/chat/session/${id}`, { method: 'DELETE' }),

  // Field issues
  createIssue: (body) => request('/knowledge/field-issues', { method: 'POST', body: JSON.stringify(body) }),
  addSolution: (issueId, body) => request(`/knowledge/field-issues/${issueId}/solution`, { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getDashboard: () => request('/admin/dashboard'),
  getUsers: () => request('/admin/users'),
  createUser: (body) => request('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getFieldIssues: (status) => request(`/admin/field-issues${status ? `?status=${status}` : ''}`),
  getWhatsappUsers: () => request('/admin/whatsapp-users'),
  addWhatsappUser: (body) => request('/admin/whatsapp-users', { method: 'POST', body: JSON.stringify(body) }),
  removeWhatsappUser: (id) => request(`/admin/whatsapp-users/${id}`, { method: 'DELETE' }),
  addModel: (body) => request('/knowledge/models', { method: 'POST', body: JSON.stringify(body) }),
  updateModel: (id, body) => request(`/knowledge/models/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getModels: (manufacturerId) => request(`/knowledge/models?manufacturerId=${manufacturerId}`),

  // Access requests
  getAccessRequests: () => request('/admin/access-requests'),
  reviewAccessRequest: (id, status) => request(`/admin/access-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAccessRequest: (id) => request(`/admin/access-requests/${id}`, { method: 'DELETE' }),

  // Authorized emails
  getAuthorizedEmails: () => request('/admin/authorized-emails'),
  addAuthorizedEmail: (body) => request('/admin/authorized-emails', { method: 'POST', body: JSON.stringify(body) }),
  removeAuthorizedEmail: (id) => request(`/admin/authorized-emails/${id}`, { method: 'DELETE' }),

  // Corrections (treinar agente)
  submitCorrection: (body) => request('/corrections', { method: 'POST', body: JSON.stringify(body) }),
  getCorrections: () => request('/corrections'),
  deleteCorrection: (id) => request(`/corrections/${id}`, { method: 'DELETE' }),

  // Photo analysis (field technician photo)
  analyzePhoto: async (file, body = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData()
    fd.append('photo', file)
    Object.entries(body).forEach(([k, v]) => v != null && fd.append(k, v))
    const res = await fetch(`${BASE}/chat/analyze-photo`, {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: fd
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Erro na análise') }
    return res.json()
  },

  // Reference photos (base de fotos de referência)
  getReferencePhotos: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString()
    return request(`/reference-photos${qs ? '?' + qs : ''}`)
  },
  getReferencePhotoUrl: (id) => request(`/reference-photos/${id}/url`),
  deleteReferencePhoto: (id) => request(`/reference-photos/${id}`, { method: 'DELETE' }),
  uploadReferencePhoto: async (file, meta) => {
    const { data: { session } } = await supabase.auth.getSession()
    const fd = new FormData()
    fd.append('photo', file)
    Object.entries(meta).forEach(([k, v]) => v != null && fd.append(k, v))
    const res = await fetch(`${BASE}/reference-photos/upload`, {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: fd
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Erro no upload') }
    return res.json()
  },

  // Documents
  getDocuments: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString()
    return request(`/documents${qs ? '?' + qs : ''}`)
  },
  getDocumentUrl: (id) => request(`/documents/${id}/url`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  analyzeDocument: (id) => request(`/documents/${id}/analyze`, { method: 'POST' }),
  // Upload direto ao Supabase Storage + processa texto via backend
  uploadDocument: async (file, meta) => {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = `documents/${fileName}`

    // 1. Upload do arquivo direto ao Supabase Storage (sem limite de 6MB do Netlify)
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (storageError) throw new Error(`Erro no storage: ${storageError.message}`)

    // 2. Backend extrai texto do arquivo já no Storage e salva no banco
    return request('/documents/process', {
      method: 'POST',
      body: JSON.stringify({ filePath, ...meta })
    })
  }
}
