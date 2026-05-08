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
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_JWT',
      token: token
    })
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    sendJWTToSW(getJWT())
  })
  if (navigator.serviceWorker.controller) {
    sendJWTToSW(getJWT())
  }
}

function buildUrl(path, query = {}) {
  const backendUrl = localStorage.getItem('backendUrl') || ''
  if (backendUrl) {
    const urlObj = new URL(backendUrl)
    const basePath = urlObj.pathname.endsWith('/') ? urlObj.pathname.slice(0, -1) : urlObj.pathname
    const newPath = path.startsWith('/') ? path : `/${path}`
    urlObj.pathname = `${basePath}${newPath}`
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        urlObj.searchParams.append(key, val)
      }
    })
    return urlObj.toString()
  } else {
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
    return data.token
  },

  downloadFile(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
}
