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

async function writeToCache(id, response) {
  const body = await response.clone().arrayBuffer()
  const headers = {}
  for (const [key, value] of response.headers.entries()) {
    headers[key] = value
  }

  return new Promise(async (resolve, reject) => {
    const transaction = cacheDB.transaction('requests', 'readwrite')
    const store = transaction.objectStore('requests')
    const request = store.put({ id, body, headers, timestamp: Date.now() })

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
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
    console.log('[SW] Cache rules updated:', cacheRules)
  }
})

self.addEventListener('fetch', (event) => {
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
            return event.respondWith(new Response(cachedResponse.body, { headers: cachedResponse.headers }))
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
        const modifiedRequest = new Request(modifiedURL, { headers: modifiedHeaders })
        
        return fetch(modifiedRequest).then(async (response) => {
          if (response.ok && rule) {
            console.log('[SW] Caching response for:', url.pathname + url.search)
            writeToCache(url.pathname + url.search, response)
          }

          response.url = url
          return response
        }).catch(err => {
          console.error('[SW] Fetch failed:', err)

          if (cachedResponse) {
            console.log('[SW] Error, returning cached response')
            return new Response(cachedResponse.body, { headers: cachedResponse.headers })
          }

          throw error
        })
      }))
    }
  }
})
