import JSZip from 'jszip'
import { LocalDB } from './localDb.js'

const BASE = import.meta.env.VITE_API_BASE || '/api'
const BASE_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

let localDataChecked = false
let localDataAvailable = false

export async function checkLocalData() {
  if (localDataChecked) return localDataAvailable
  localDataChecked = true
  localDataAvailable = await LocalDB.hasLocalData()
  if (localDataAvailable) {
    localStorage.setItem('localMode', 'true')
  }
  return localDataAvailable
}

export function isLocalMode() {
  return localStorage.getItem('localMode') === 'true'
}

export function setLocalMode(val) {
  if (val) {
    localStorage.setItem('localMode', 'true')
  } else {
    localStorage.removeItem('localMode')
  }
}

const pathToStore = {
  '/users': 'users',
  '/channels': 'channels',
  '/videos': 'videos',
  '/music': 'music',
  '/playlists': 'playlists',
  '/subscriptions': 'subscriptions',
  '/settings': 'settings',
}

async function fetchFromLocal(path, query) {
  const basePath = path.split('?')[0].replace(/\/+$/, '')
  const store = pathToStore[basePath]
    if (store) {
      let data = await LocalDB.getAll(store)
      if (query.user_id) {
        const uid = parseInt(query.user_id)
        data = data.filter(r => r.added_by === uid || r.user_id === uid)
      }
      if (store === 'videos' || store === 'music') {
        data = data.map(d => ({ ...d, downloaded: true }))
      }
      return data
    }
  if (basePath.startsWith('/channels/') && basePath.endsWith('/videos')) {
    return []
  }
  if (basePath.startsWith('/videos/info') || basePath.startsWith('/music/info')) {
    return { formats: [] }
  }
  const match = basePath.match(/^\/(\w+)\/(\d+)/)
  if (match) {
    const [, table, id] = match
    if (pathToStore[`/${table}`]) {
      const record = await LocalDB.get(pathToStore[`/${table}`], parseInt(id))
      return record || null
    }
  }
  throw new Error(`Local data not available for: ${path}`)
}

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
    if (isLocalMode()) {
      return fetchFromLocal(path, query)
    }
    await swReady
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    try {
      const res = await fetch(buildUrl(path, query), { headers })
      if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
      if (json) {
        return res.json()
      }
      return res
    } catch (e) {
      if (isLocalMode()) {
        return fetchFromLocal(path, query)
      }
      throw e
    }
  },

  async post(path, body = {}) {
    if (isLocalMode()) return { ok: true }
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

  async put(path, body = {}) {
    if (isLocalMode()) return { ok: true }
    await swReady
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS, 'Content-Type': 'application/json' }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const res = await fetch(buildUrl(path), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
    return res.json()
  },

  async delete(path) {
    if (isLocalMode()) return { ok: true }
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

  async exportData(body = {}) {
    await swReady
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS, 'Content-Type': 'application/json' }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const res = await fetch(buildUrl('/export'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`Export failed: ${res.status}`)
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?(.+?)"?$/)
    const filename = match ? match[1] : `hometube-export.ht`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return filename
  },

  async importData(file, localOnly = false) {
    const useLocal = localOnly || isLocalMode() || !navigator.onLine
    if (useLocal) {
      const arrayBuf = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuf)
      const metaFile = zip.file('metadata.json')
      if (!metaFile) throw new Error('Invalid .ht file: missing metadata.json')
      const metadataStr = await metaFile.async('string')
      const metadata = JSON.parse(metadataStr)

      await LocalDB.clearAll()
      const summary = { users: 0, channels: 0, subscriptions: 0, videos: 0, music: 0, playlists: 0 }
      const idMap = {}

      if (metadata.users && metadata.users.length > 0) {
        const cleaned = metadata.users.map(u => {
          const { id, ...rest } = u
          return rest
        })
        await LocalDB.store('users', cleaned)
        idMap.users = {}
        metadata.users.forEach((u, i) => { idMap.users[u.id] = cleaned[i].id })
        summary.users = cleaned.length
      } else {
        const defaultUser = { username: 'default' }
        await LocalDB.store('users', defaultUser)
        idMap.users = {}
        summary.users = 1
      }

      if (metadata.channels) {
        const cleaned = metadata.channels.map(c => {
          const { id, ...rest } = c
          return rest
        })
        await LocalDB.store('channels', cleaned)
        idMap.channels = {}
        metadata.channels.forEach((c, i) => { idMap.channels[c.id] = cleaned[i].id })
        summary.channels = cleaned.length
      }

      if (metadata.subscriptions) {
        const cleaned = metadata.subscriptions.map(s => {
          const { id, channel_id, user_id, ...rest } = s
          return {
            ...rest,
            channel_id: idMap.channels?.[channel_id] || channel_id,
            user_id: idMap.users?.[user_id] || user_id,
          }
        })
        await LocalDB.store('subscriptions', cleaned)
        summary.subscriptions = cleaned.length
      }

      if (metadata.videos) {
        const cleaned = metadata.videos.map(v => {
          const { id, channel_id, added_by, ...rest } = v
          return {
            ...rest,
            channel_id: idMap.channels?.[channel_id] || channel_id,
            added_by: idMap.users?.[added_by] || added_by,
          }
        })
        await LocalDB.store('videos', cleaned)
        idMap.videos = {}
        metadata.videos.forEach((v, i) => { idMap.videos[v.id] = cleaned[i].id })
        summary.videos = cleaned.length
      }

      if (metadata.music) {
        const cleaned = metadata.music.map(m => {
          const { id, added_by, ...rest } = m
          return { ...rest, added_by: idMap.users?.[added_by] || added_by }
        })
        await LocalDB.store('music', cleaned)
        idMap.music = {}
        metadata.music.forEach((m, i) => { idMap.music[m.id] = cleaned[i].id })
        summary.music = cleaned.length
      }

      if (metadata.playlists) {
        const cleaned = metadata.playlists.map(p => {
          const { id, user_id, songs, ...rest } = p
          const mappedSongs = (songs || []).map(s => ({
            ...s,
            music_id: idMap.music?.[s.music_id] || s.music_id,
          }))
          return {
            ...rest,
            songs: mappedSongs,
            user_id: idMap.users?.[user_id] || user_id,
          }
        })
        await LocalDB.store('playlists', cleaned)
        summary.playlists = cleaned.length
      }

      const videoFiles = zip.file(/^videos\//)
      for (const zf of videoFiles) {
        const name = zf.name.replace('videos/', '')
        const blob = await zf.async('blob')
        const mime = name.endsWith('.mp4') ? 'video/mp4' : 'video/webm'
        const fileBlob = new Blob([await blob.arrayBuffer()], { type: mime })
        await LocalDB.storeFile(`video_${name}`, 'video', fileBlob, { filename: name })
      }

      const musicFiles = zip.file(/^music\//)
      for (const zf of musicFiles) {
        const name = zf.name.replace('music/', '')
        const blob = await zf.async('blob')
        const ext = name.split('.').pop().toLowerCase()
        const mimeTypes = { mp3: 'audio/mpeg', webm: 'audio/webm', m4a: 'audio/mp4', ogg: 'audio/ogg', flac: 'audio/flac', wav: 'audio/wav' }
        const mime = mimeTypes[ext] || 'audio/mpeg'
        const fileBlob = new Blob([await blob.arrayBuffer()], { type: mime })
        await LocalDB.storeFile(`music_${name}`, 'music', fileBlob, { filename: name })
      }

      setLocalMode(true)
      return { ok: true, summary }
    }

    await swReady
    const jwt = getJWT()
    const queryToken = getQueryToken()
    const headers = { ...BASE_HEADERS }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else if (queryToken) headers['Authorization'] = `Bearer ${queryToken}`
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(buildUrl('/import'), {
      method: 'POST',
      headers,
      body: formData
    })
    if (!res.ok) {
      const text = await res.text()
      let detail = `Import failed: ${res.status}`
      try { detail = JSON.parse(text).detail || detail } catch {}
      throw new Error(detail)
    }
    return res.json()
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
