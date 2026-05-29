const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(err)
  }
  return res.json()
}

export const api = {
  listCases: () => request('/cases'),
  getCase: (id) => request(`/cases/${id}`),
  createCase: (data) => request('/cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCase: (id, data) => request(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCase: (id) => request(`/cases/${id}`, { method: 'DELETE' }),
  getInsights: (id) => request(`/cases/${id}/insights`, { method: 'POST' }),
  analyzeBail: (id) => request(`/cases/${id}/bail-analysis`, { method: 'POST' }),
  debate: (id, argument, role) => request(`/cases/${id}/debate`, {
    method: 'POST', body: JSON.stringify({ argument, role }),
  }),
  generateDraft: (id, type) => request(`/cases/${id}/draft`, {
    method: 'POST', body: JSON.stringify({ type }),
  }),
  askQuestion: (id, question) => request(`/cases/${id}/ask`, {
    method: 'POST', body: JSON.stringify({ question }),
  }),
  uploadDocs: (formData) => {
    return fetch('/api/cases/upload-docs', {
      method: 'POST',
      body: formData,
    }).then(res => {
      if (!res.ok) throw new Error('Failed to upload documents')
      return res.json()
    })
  },
  ragAsk: (id, question) => request(`/cases/${id}/rag-ask`, {
    method: 'POST', body: JSON.stringify({ question }),
  }),
  generateLegalDraft: (id, type, details) => request(`/cases/${id}/legal-draft`, {
    method: 'POST', body: JSON.stringify({ type, ...details }),
  }),
}
