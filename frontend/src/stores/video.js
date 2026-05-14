import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API } from '../api.js'
import { useUserStore } from './user.js'

export const useVideoStore = defineStore('video', () => {
  const videos = ref([])
  const loadSettings = () => { try { return JSON.parse(localStorage.getItem('settings') || '{}') } catch { return {} } }
  const currentFilter = ref(loadSettings().defaultVideoFilter || 'my-feed')
  const playingVideo = ref(null)
  const audioMode = ref(false)
  const wakeLock = ref(null)

  const filters = [
    { id: 'my-feed', label: 'My Feed' },
    { id: 'all', label: 'All Videos' },
    { id: 'unwatched', label: 'Unwatched' }
  ]

  const filteredVideos = computed(() => {
    if (currentFilter.value === 'my-feed') {
      const userStore = useUserStore()
      return videos.value.filter(v => v.added_by === userStore.user?.id)
    }
    return videos.value
  })

  const load = async () => {
    const userStore = useUserStore()
    if (!userStore.user?.id) return
    const filter = currentFilter.value === 'my-feed' ? 'all' : currentFilter.value
    try {
      const data = await API.get('/videos', { user_id: userStore.user.id, filter })
      videos.value = Array.isArray(data) ? data : []
    } catch (e) {
      console.error('Failed to load videos:', e)
      videos.value = []
    }
  }

  const setFilter = (filter) => {
    currentFilter.value = filter
    load()
  }

  const playVideo = async (vid) => {
    playingVideo.value = vid
    await API.post(`/videos/${vid.id}/watch`, { watched: true })
    load()
  }

  const releaseWakeLock = () => {
    if (wakeLock.value) {
      try { wakeLock.value.release() } catch {}
      wakeLock.value = null
    }
  }

  const acquireWakeLock = async () => {
    if ('wakeLock' in navigator && !wakeLock.value) {
      try {
        wakeLock.value = await navigator.wakeLock.request('screen')
        wakeLock.value.addEventListener('release', () => {
          wakeLock.value = null
          if (audioMode.value) acquireWakeLock()
        })
      } catch {}
    }
  }

  const toggleAudioMode = async () => {
    audioMode.value = !audioMode.value
    if (audioMode.value) {
      acquireWakeLock()
    } else {
      releaseWakeLock()
    }
  }

  const toggleKeep = async (vid) => {
    await API.post(`/videos/${vid.id}/keep`, { keep: !vid.keep_flag })
    load()
  }

  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && audioMode.value) {
        acquireWakeLock()
      }
    })
  }

  return {
    videos,
    currentFilter,
    playingVideo,
    audioMode,
    wakeLock,
    filters,
    filteredVideos,
    load,
    setFilter,
    playVideo,
    toggleAudioMode,
    toggleKeep
  }
})
