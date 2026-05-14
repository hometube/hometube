import { ServerProvider } from './ServerProvider.js'
import { LocalProvider } from './LocalProvider.js'

let _provider = null
let _modeListeners = []

function _detectMode() {
  return localStorage.getItem('localMode') === 'true'
}

function _buildProvider() {
  const mode = _detectMode()
  return mode ? new LocalProvider() : new ServerProvider()
}

export function getProvider() {
  if (!_provider) {
    _provider = _buildProvider()
    window._provider = _provider
  }
  return _provider
}

export function isLocalMode() {
  return getProvider().type === 'local'
}

export function setLocalMode(val) {
  if (val) {
    localStorage.setItem('localMode', 'true')
  } else {
    localStorage.removeItem('localMode')
  }
  _provider = _buildProvider()
  _modeListeners.forEach(fn => fn(val))
}

export function setServerMode() {
  localStorage.removeItem('localMode')
  _provider = _buildProvider()
  _modeListeners.forEach(fn => fn(false))
}

export function getCurrentMode() {
  return getProvider().type
}

export function getModeName() {
  return getProvider().name
}

export function onModeChange(fn) {
  _modeListeners.push(fn)
  return () => {
    _modeListeners = _modeListeners.filter(f => f !== fn)
  }
}

let _checkPromise = null
export async function checkLocalData() {
  if (_checkPromise) return _checkPromise
  _checkPromise = (async () => {
    const { LocalDB } = await import('../localDb.js')
    const hasData = await LocalDB.hasLocalData()
    return hasData
  })()
  return _checkPromise
}
