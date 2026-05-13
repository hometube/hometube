export class DataProvider {
  constructor() {
    this._blobUrls = []
  }

  get type() { throw new Error('abstract') }
  get name() { throw new Error('abstract') }

  async get(path, query) { throw new Error('abstract') }
  async post(path, body) { throw new Error('abstract') }
  async put(path, body) { throw new Error('abstract') }
  async delete(path) { throw new Error('abstract') }

  async exchangeToken(token) { throw new Error('abstract') }
  async ping() { throw new Error('abstract') }

  async getVideoUrl(video) {
    throw new Error('abstract')
  }

  async getMusicUrl(song) {
    throw new Error('abstract')
  }

  releaseUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      this._blobUrls = this._blobUrls.filter(u => u !== url)
    }
  }

  releaseAllUrls() {
    this._blobUrls.forEach(url => URL.revokeObjectURL(url))
    this._blobUrls = []
  }

  _trackBlobUrl(url) {
    this._blobUrls.push(url)
    return url
  }

  async exportData(body) { throw new Error('abstract') }
  async importData(file) { throw new Error('abstract') }

  cache(path, options) {}
  checkCache(paths) { return Promise.resolve({}) }
  downloadFile(url, filename) {}
}
