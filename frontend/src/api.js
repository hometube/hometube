const API = {
  getBaseUrl() {
    return localStorage.getItem('backendUrl') || '/api'
  },
  async get(path, params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${this.getBaseUrl()}${path}?${q}`)
    return res.json()
  },
  async post(path, body = {}) {
    const res = await fetch(`${this.getBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.json()
  },
  async delete(path) {
    const res = await fetch(`${this.getBaseUrl()}${path}`, { method: 'DELETE' })
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
