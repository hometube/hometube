let jwtToken = null

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_JWT') {
    jwtToken = event.data.token
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  if (url.pathname.startsWith('/api/')) {
    const headers = new Headers(event.request.headers)
    if (jwtToken) {
      headers.set('Authorization', `Bearer ${jwtToken}`)
    }
    
    const modifiedRequest = new Request(event.request, {
      headers: headers
    })
    
    event.respondWith(fetch(modifiedRequest))
  }
})
