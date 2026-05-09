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

export const ServiceWorker = {
  ready: false,
  async sendJWT(token) {
    if (!ServiceWorker.ready) {
      await swReady
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[API] Sending JWT to SW:', token ? 'present' : 'empty')
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_JWT',
        token: token
      })
    } else {
      console.log('[API] No SW controller available')
    }
  },
  async sendBackendUrl(url) {
    if (!ServiceWorker.ready) {
      await swReady
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[API] Sending backend URL to SW:', url)
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BACKEND_URL',
        url: url
      })
    } else {
      console.log('[API] No SW controller available')
    }
  },
  async sendCacheRule(path, options) {
    if (!ServiceWorker.ready) {
      await swReady
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[API] Sending cache rule to SW:', path, options)
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_CACHE_RULE',
        path,
        options
      })
    } else {
      console.log('[API] No SW controller available')
    }
  },
  async checkCache(paths) {
    if (!ServiceWorker.ready) {
      await swReady
    }
    return new Promise((resolve) => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        channel.port1.onmessage = (event) => {
          if (event.data?.type === 'CACHE_STATUS') {
            resolve(event.data.status)
          }
        }
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_CACHE',
          paths
        }, [channel.port2])
      } else {
        resolve({})
      }
    })
  }
}

const swReady = new Promise(resolve => {
  if (!('serviceWorker' in navigator)) {
    resolve()
    return
  }
  if (navigator.serviceWorker.controller) {
    console.log('[API] SW controller already active')
    ServiceWorker.ready = true
    ServiceWorker.sendJWT(getJWT())
    ServiceWorker.sendBackendUrl(localStorage.getItem('backendUrl') || '')
    setTimeout(resolve, 100)
  } else {
    console.log('[API] Waiting for SW controller...')
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[API] SW controller changed')
      ServiceWorker.ready = true
      ServiceWorker.sendJWT(getJWT())
      ServiceWorker.sendBackendUrl(localStorage.getItem('backendUrl') || '')
      setTimeout(resolve, 100)
    })
  }
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('[API] SW registrations:', registrations.length)
    registrations.forEach(reg => {
      console.log('[API] - SW scope:', reg.scope, 'active:', !!reg.active)
    })
  })
})

function buildUrl(path, query = {}) {
  const swActive = 'serviceWorker' in navigator && navigator.serviceWorker.controller
  const storedUrl = localStorage.getItem('backendUrl')
  const hasJwt = !!getJWT()

  if (storedUrl && (!swActive || !hasJwt)) {
    const baseUrl = storedUrl.split('?')[0]
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, val)
      }
    })
    const qs = params.toString()
    return qs ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`
  }

  const url = `${BASE}${path}`
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, val)
    }
  })
  const qs = params.toString()
  console.log('[API] url:', qs ? `${url}?${qs}` : url)
  return qs ? `${url}?${qs}` : url
}

export const API = {
  async get(path, query = {}, json = true) {
    await swReady
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const res = await fetch(buildUrl(path, query), { headers })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    if (json) {
      return res.json()
    }
    return res
  },

  async post(path, body = {}) {
    await swReady
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
    await swReady
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
      await swReady
      await API.get(`/status`)
      return true
    } catch {
      return false
    }
  },

  async cache(path, options, json = true) {
    await swReady
    ServiceWorker.sendCacheRule('/api' + path, options)
    await new Promise(resolve => setTimeout(resolve, 100))
    return API.get(path, {}, json)
  },
  async checkCache(paths) {
    await swReady
    return ServiceWorker.checkCache(paths)
  },

  async downloadFile(url, filename) {
    await swReady
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
