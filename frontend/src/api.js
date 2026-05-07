const API = {
  getBaseUrlAndToken() {
    const backendUrl = localStorage.getItem('backendUrl') || '/api'
    
    // If it's a full URL, check for token parameter
    if (backendUrl.startsWith('http')) {
      try {
        const url = new URL(backendUrl)
        const token = url.searchParams.get('token')
        
        // Remove token parameter from URL for actual requests
        url.searchParams.delete('token')
        const cleanUrl = url.toString()
        
        return { baseUrl: cleanUrl, token }
      } catch (e) {
        // If URL parsing fails, return as-is
        return { baseUrl: backendUrl, token: null }
      }
    }
    
    // For relative URLs (/api), no token
    return { baseUrl: backendUrl, token: null }
  },
  
  async get(path, params = {}) {
    const { baseUrl, token } = this.getBaseUrlAndToken()
    const q = new URLSearchParams(params).toString()
    
    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const res = await fetch(`${baseUrl}${path}?${q}`, { headers })
    return res.json()
  },
  
  async post(path, body = {}) {
    const { baseUrl, token } = this.getBaseUrlAndToken()
    
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    return res.json()
  },
  
  async delete(path) {
    const { baseUrl, token } = this.getBaseUrlAndToken()
    
    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers })
    return res.json()
  },
  
  async downloadFile(url, filename) {
    const response = await fetch(url)
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }
}
export { API }
