import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API, isLocalMode } from '../api.js'
import { LocalDB } from '../localDb.js'
import { useUserStore } from './user.js'

export const useVideoStore = defineStore('video', () => {
  const videos = ref([])
  const currentFilter = ref('my-feed')
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
    console.log('Loading videos...')
    const userStore = useUserStore()
    if (!userStore.user?.id) return console.warn('No user ID found, cannot load videos.')
    const filter = currentFilter.value === 'my-feed' ? 'all' : currentFilter.value
    try {
      let data
      if (isLocalMode()) {
        data = await LocalDB.getAll('videos')
      } else {
        data = await API.get('/videos', { user_id: userStore.user.id, filter })
      }
      videos.value = Array.isArray(data) ? data : []
      console.log('Loaded videos:', videos.value)
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
    if (!isLocalMode()) {
      await API.post(`/videos/${vid.id}/watch`, { watched: true })
      load()
    }
  }

  const toggleAudioMode = async () => {
    audioMode.value = !audioMode.value
    if (audioMode.value && 'wakeLock' in navigator) {
      try {
        wakeLock.value = await navigator.wakeLock.request('screen')
      } catch (e) {}
    } else if (!audioMode.value && wakeLock.value) {
      wakeLock.value.release()
      wakeLock.value = null
    }
  }

  const toggleKeep = async (vid) => {
    if (isLocalMode()) return
    await API.post(`/videos/${vid.id}/keep`, { keep: !vid.keep_flag })
    load()
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
