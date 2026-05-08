const BASE = import.meta.env.VITE_API_BASE || '/api'
const BASE_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

function getJWT() {
  return localStorage.getItem('jwt_token') || ''
}

function getQueryToken() {
  const url = localStorage.getItem('backendUrl') || ''
  const params = new URLSearchParams(url.split('?')[1] || '')
  return params.get('token') || ''
}

function sendJWTToSW(token) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log('[API] Sending JWT to SW:', token ? 'present' : 'empty')
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_JWT',
      token: token
    })
  } else {
    console.log('[API] No SW controller available')
  }
}

export function sendBackendUrlToSW(url) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log('[API] Sending backend URL to SW:', url)
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_BACKEND_URL',
      url: url
    })
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[API] SW controller changed')
    sendJWTToSW(getJWT())
    sendBackendUrlToSW(localStorage.getItem('backendUrl') || '')
  })
  if (navigator.serviceWorker.controller) {
    console.log('[API] SW controller already active')
    sendJWTToSW(getJWT())
    sendBackendUrlToSW(localStorage.getItem('backendUrl') || '')
  } else {
    console.log('[API] No active SW controller on load')
  }
  
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('[API] SW registrations:', registrations.length)
    registrations.forEach(reg => {
      console.log('[API] - SW scope:', reg.scope, 'active:', !!reg.active)
    })
  })
}

function buildUrl(path, query = {}) {
  const url = `${BASE}${path}`
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, val)
    }
  })
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export const API = {
  async get(path, query = {}) {
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const res = await fetch(buildUrl(path, query), { headers })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  },

  async post(path, body = {}) {
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS, 'Content-Type': 'application/json' }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const res = await fetch(buildUrl(path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
    return res.json()
  },

  async delete(path) {
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const res = await fetch(buildUrl(path), {
      method: 'DELETE',
      headers
    })
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
    return res.json()
  },

  async exchangeToken(tempToken) {
    const res = await fetch(buildUrl('/auth/exchange'), {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tempToken })
    })
    if (!res.ok) throw new Error('Token exchange failed')
    const data = await res.json()
    localStorage.setItem('jwt_token', data.token)
    sendJWTToSW(data.token)
    return data.token
  },

  async pingServer() {
    try {
      const res = await API.get(`/status`)
      return res.ok
    } catch {
      return false
    }
  },

  async downloadFile(url, filename) {
    console.log('[API] Downloading file:', url)
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = {}
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`
    } else if (queryToken) {
      headers['Authorization'] = `Bearer ${queryToken}`
    }
    
    try {
      const res = await fetch(url, { headers })
      console.log('[API] Download response:', res.status, res.ok)
      const blob = await res.blob()
      console.log('[API] Blob received:', blob.size, 'bytes')
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch(err) {
      console.error('[API] Download failed:', err)
    }
  }
}

export async function pingBackend() {
  return API.pingServer()
}
