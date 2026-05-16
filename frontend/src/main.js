import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import { useErrorStore } from './stores/errors.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

let _errorStore = null
function getErrorStore() {
  if (!_errorStore) _errorStore = useErrorStore(pinia)
  return _errorStore
}

app.config.errorHandler = (err, _instance, info) => {
  getErrorStore().addEvent({
    type: 'vue',
    message: err?.message || String(err),
    stack: err?.stack || '',
    component: info || ''
  })
  console.error('[Vue error]', err, info)
}

window.onerror = (message, source, lineno, colno, error) => {
  getErrorStore().addEvent({
    type: 'js',
    message: message || error?.message || String(message),
    stack: error?.stack || '',
    file: source || '',
    line: lineno || '',
    col: colno || ''
  })
  console.error('[JS error]', message, source, lineno, colno, error)
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  getErrorStore().addEvent({
    type: 'promise',
    message: reason?.message || String(reason),
    stack: reason?.stack || ''
  })
  console.error('[Unhandled rejection]', event.reason)
})

app.mount('#app')
