import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ServiceWorker, pingBackend } from '../api'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const backendUrl = ref(localStorage.getItem('backendUrl') || '')
  const online = ref(false)
  const checked = ref(false)
  let pingInterval = null

  const hasUser = computed(() => !!user.value)
  const hasBackend = computed(() => backendUrl.value.trim().length > 0)

  const checkConnection = async () => {
    online.value = await pingBackend()
    checked.value = true
  }

  const startPinging = () => {
    if (pingInterval) return
    checkConnection()
    pingInterval = setInterval(checkConnection, 60000)
  }

  const stopPinging = () => {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
    online.value = false
    checked.value = false
  }

  const setUser = (newUser) => {
    user.value = newUser
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const setBackendUrl = (url) => {
    backendUrl.value = url.trim()
    if (!url.trim()) {
      localStorage.removeItem('backendUrl')
    } else {
      localStorage.setItem('backendUrl', url.trim())
      ServiceWorker.sendBackendUrl(url.trim())
    }
  }

  const clearUser = () => {
    user.value = null
    localStorage.removeItem('user')
  }

  return {
    user,
    backendUrl,
    online,
    checked,
    hasUser,
    hasBackend,
    checkConnection,
    startPinging,
    stopPinging,
    setUser,
    setBackendUrl,
    clearUser
  }
})
