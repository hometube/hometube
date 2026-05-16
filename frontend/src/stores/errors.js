import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useErrorStore = defineStore('errors', () => {
  const events = ref([])
  const maxEvents = 100

  const count = computed(() => events.value.length)
  const unreadCount = computed(() => events.value.filter(e => !e.read).length)

  function addEvent(event) {
    events.value.unshift({
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type: event.type || 'unknown',
      message: event.message || '',
      stack: event.stack || '',
      component: event.component || '',
      file: event.file || '',
      line: event.line || '',
      col: event.col || '',
      read: false
    })
    if (events.value.length > maxEvents) {
      events.value = events.value.slice(0, maxEvents)
    }
  }

  function markAllRead() {
    events.value.forEach(e => e.read = true)
  }

  function clearEvents() {
    events.value = []
  }

  return { events, count, unreadCount, addEvent, markAllRead, clearEvents }
})
