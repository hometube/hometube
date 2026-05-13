import { getProvider, isLocalMode, setLocalMode, setServerMode, checkLocalData, getCurrentMode, getModeName, onModeChange } from './providers/index.js'

export { getProvider, isLocalMode, setLocalMode, setServerMode, checkLocalData, getCurrentMode, getModeName, onModeChange }

const providerHandler = {
  get(_, prop) {
    const provider = getProvider()
    if (typeof provider[prop] === 'function') {
      return (...args) => provider[prop](...args)
    }
    return provider[prop]
  }
}

export const API = new Proxy({}, providerHandler)

const swHandler = {
  get(_, prop) {
    const provider = getProvider()
    const sw = provider.sw
    if (sw) {
      if (typeof sw[prop] === 'function') {
        return (...args) => sw[prop](...args)
      }
      return sw[prop]
    }
    return () => {}
  }
}

export const ServiceWorker = new Proxy({}, swHandler)

export async function pingBackend() {
  return getProvider().ping()
}
