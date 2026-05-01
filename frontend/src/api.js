const API = {
  base: '/api',
  async get(path, params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await fetch(`${this.base}${path}?${q}`)
    return res.json()
  },
  async post(path, body = {}) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.json()
  }
}
export { API }
