import { precacheAndRoute } from 'workbox-precaching'

console.log('[SW] Service Worker loading...')
precacheAndRoute(self.__WB_MANIFEST)

let jwtToken = null
let backendUrl = null

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
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)  
  if (url.pathname.startsWith('/api/')) {
    console.log('[SW] Intercepted API request:', url.pathname + url.search)
    
    if (jwtToken) {
      console.log('[SW] Adding Authorization header')
      const modifiedHeaders = new Headers(event.request.headers)
      modifiedHeaders.set('Authorization', `Bearer ${jwtToken}`)
      modifiedHeaders.set('ngrok-skip-browser-warning', 'true')
      const backendOrigin = new URL(backendUrl)
      const modifiedURL = new URL(event.request.url)
      modifiedURL.protocol = backendOrigin.protocol
      modifiedURL.host = backendOrigin.host
      const modifiedRequest = new Request(modifiedURL, {
        headers: modifiedHeaders
      })

      console.log('[SW] Modified request:', modifiedRequest)
      
      event.respondWith(
        fetch(modifiedRequest).catch(err => {
          console.error('[SW] Fetch failed:', err)
          throw err
        })
      )
    } else {
      console.log('[SW] No JWT token, passing through')
    }
  } else {
    console.log('[SW] Not an API request, passing through')
  }
})
