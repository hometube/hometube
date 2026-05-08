import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const backendUrl = ref(localStorage.getItem('backendUrl') || '')

  const hasUser = computed(() => !!user.value)
  const hasBackend = computed(() => backendUrl.value.trim().length > 0)

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
    }
  }

  const clearUser = () => {
    user.value = null
    localStorage.removeItem('user')
  }

  return {
    user,
    backendUrl,
    hasUser,
    hasBackend,
    setUser,
    setBackendUrl,
    clearUser
  }
})
