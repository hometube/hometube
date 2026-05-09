import { precacheAndRoute } from 'workbox-precaching'

console.log('[SW] Service Worker loading...')
precacheAndRoute(self.__WB_MANIFEST)

let jwtToken = null
let backendUrl = null
const cacheRules = {}
let cacheDB = null
const CacheRequest = indexedDB.open('request-cache', 4)

CacheRequest.onupgradeneeded = (event) => {
  const db = event.target.result
  if (!db.objectStoreNames.contains('requests')) {
    db.createObjectStore('requests', { keyPath: 'id' })
  }
}

CacheRequest.onsuccess = (event) => {
  cacheDB = event.target.result
}

CacheRequest.onerror = (event) => {
  console.error('[SW] Error opening cache database:', event.target.error)
}

async function readFromCache(id) {
  return new Promise((resolve, reject) => {
    const transaction = cacheDB.transaction('requests', 'readonly')
    const store = transaction.objectStore('requests')
    const request = store.get(id)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

async function writeToCache(id, data) {
  if (data instanceof Response) {
    return writeToCache(id, {
      body: await data.clone().arrayBuffer(),
      headers: Object.fromEntries(data.headers.entries()),
      timestamp: Date.now()
    })
  }

  return new Promise(async (resolve, reject) => {
    const transaction = cacheDB.transaction('requests', 'readwrite')
    const store = transaction.objectStore('requests')
    const request = store.put({ id, ...data, timestamp: Date.now() })

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

let restoredCacheRules = false
async function restoreCacheRules() {
  if (restoredCacheRules) return
  restoredCacheRules = true

  const cachedRules = await readFromCache("!cache-rules")

  if (cachedRules) {
    Object.assign(cacheRules, cachedRules.rules)
  }
}

self.addEventListener('install', () => {
  console.log('[SW] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  if (event.data?.type === 'SET_JWT') {
    jwtToken = event.data.token
    console.log('[SW] JWT updated:', jwtToken ? 'present' : 'empty')
  }
  if (event.data?.type === 'SET_BACKEND_URL') {
    backendUrl = event.data.url
    console.log('[SW] Backend URL updated:', backendUrl)
  }
  if (event.data?.type === 'SET_CACHE_RULE') {
    cacheRules[event.data.path] = event.data.options
    writeToCache("!cache-rules", { rules: cacheRules })
    console.log('[SW] Cache rules updated:', cacheRules)
  }
  if (event.data?.type === 'CHECK_CACHE') {
    const paths = event.data.paths
    const results = {}
    const transaction = cacheDB.transaction('requests', 'readonly')
    const store = transaction.objectStore('requests')
    Promise.all(paths.map(path => {
      return new Promise(resolve => {
        const req = store.get(path)
        req.onsuccess = () => resolve({ path, found: !!req.result })
        req.onerror = () => resolve({ path, found: false })
      })
    })).then(results => {
      const status = {}
      results.forEach(r => status[r.path] = r.found)
      if (event.ports[0]) {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', status })
      }
    })
  }
})

self.addEventListener('fetch', (event) => {
  restoreCacheRules()

  const url = new URL(event.request.url)  
  if (url.pathname.startsWith('/api/')) {
    console.log('[SW] Intercepted API request:', url.pathname + url.search)
    
    if (jwtToken && backendUrl) {
      event.respondWith(new Promise(async (resolve, reject) => {
        const rule = cacheRules[url.pathname]
        let cachedResponse = null
  
        if (rule) {
          cachedResponse = await readFromCache(url.pathname + url.search)
  
          if (!cachedResponse) {
            console.log('[SW] No cached response found, fetching new one.')
          } else if (rule.refetch) {
            console.log('[SW] attempting to refetch response for:', url.pathname + url.search)
          } else if (rule.ttl && Date.now() > cachedResponse.timestamp + rule.ttl) {
            console.log('[SW] Cached response expired, attempting to fetch new one.')
          } else {
            console.log('[SW] Returning cached response:', cachedResponse)
            return resolve(new Response(cachedResponse.body, { headers: cachedResponse.headers }))
          }
        }
  
        const modifiedHeaders = new Headers(event.request.headers)
        modifiedHeaders.set('Authorization', `Bearer ${jwtToken}`)
        modifiedHeaders.set('ngrok-skip-browser-warning', 'true')
        const backendOrigin = new URL(backendUrl)
        const modifiedURL = new URL(event.request.url)
        modifiedURL.protocol = backendOrigin.protocol
        modifiedURL.host = backendOrigin.host
        modifiedURL.port = backendOrigin.port
        const isStreamBody = !['GET', 'HEAD'].includes(event.request.method) && event.request.body !== null
        const modifiedRequest = new Request(modifiedURL.toString(), {
          method: event.request.method,
          headers: modifiedHeaders,
          body: isStreamBody ? event.request.body : null,
          ...(isStreamBody ? { duplex: 'half' } : {}),
          mode: 'cors',
          credentials: 'omit'
        })
        
        try {
          const response = await fetch(modifiedRequest)

          if (response.ok && rule) {
            console.log('[SW] Caching response for:', url.pathname + url.search)
            writeToCache(url.pathname + url.search, response)
          }

          resolve(response)
        } catch (error) {
          console.error('[SW] Fetch failed:', error)

          if (cachedResponse) {
            console.log('[SW] Error, returning cached response')
            resolve(new Response(cachedResponse.body, { headers: cachedResponse.headers }))
          } else {
            reject(error)
          }
        }
      }))
    }
  }
})
