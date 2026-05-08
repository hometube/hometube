const BASE = import.meta.env.VITE_API_BASE || '/api'

function getToken() {
  const url = localStorage.getItem('backendUrl') || ''
  const params = new URLSearchParams(url.split('?')[1] || '')
  return params.get('token') || ''
}

function buildUrl(path, query = {}) {
  const baseUrl = localStorage.getItem('backendUrl') || ''
  const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : `${BASE}${path}`
  const params = new URLSearchParams()
  Object.entries(query).forEach((entry) => {
    const [key, val] = entry
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, val)
    }
  })
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export const API = {
  async get(path, query = {}) {
    const token = getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(buildUrl(path, query), { headers })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  },

  async post(path, body = {}) {
    const token = getToken()
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(buildUrl(path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
    return res.json()
  },

  async delete(path) {
    const token = getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(buildUrl(path), {
      method: 'DELETE',
      headers
    })
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
    return res.json()
  },

  downloadFile(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
}
