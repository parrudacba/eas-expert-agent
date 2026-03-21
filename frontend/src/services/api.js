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

  // Field issues
  createIssue: (body) => request('/knowledge/field-issues', { method: 'POST', body: JSON.stringify(body) }),
  addSolution: (issueId, body) => request(`/knowledge/field-issues/${issueId}/solution`, { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getDashboard: () => request('/admin/dashboard'),
  getUsers: () => request('/admin/users'),
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getFieldIssues: (status) => request(`/admin/field-issues${status ? `?status=${status}` : ''}`),
  getWhatsappUsers: () => request('/admin/whatsapp-users'),
  addWhatsappUser: (body) => request('/admin/whatsapp-users', { method: 'POST', body: JSON.stringify(body) }),
  removeWhatsappUser: (id) => request(`/admin/whatsapp-users/${id}`, { method: 'DELETE' }),
  addModel: (body) => request('/knowledge/models', { method: 'POST', body: JSON.stringify(body) }),

  // Documents
  getDocuments: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString()
    return request(`/documents${qs ? '?' + qs : ''}`)
  },
  getDocumentUrl: (id) => request(`/documents/${id}/url`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  uploadDocument: async (formData) => {
    const { data: { session } } = await (await import('./supabase.js')).supabase.auth.getSession()
    const BASE = import.meta.env.VITE_API_URL || '/api'
    const res = await fetch(`${BASE}/documents/upload`, {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: formData
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
    return res.json()
  }
}
