import { ref, computed, onMounted, onUnmounted } from 'vue'
import { API } from '../api.js'

const audio = ref(null)
const playlist = ref(null)
const playlistId = ref(null)
const displaySongs = ref([])
const originalOrder = ref([])
const currentIndex = ref(-1)
const shuffled = ref(false)
const repeat = ref(false)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const initialized = ref(false)

const init = () => {
  if (initialized.value) return
  initialized.value = true
  audio.value = new Audio()
  audio.value.addEventListener('ended', () => {
    if (currentIndex.value < displaySongs.value.length - 1) {
      playSong(currentIndex.value + 1)
    } else if (repeat.value) {
      playSong(0)
    } else {
      playing.value = false
    }
  })
  audio.value.addEventListener('loadedmetadata', () => {
    duration.value = audio.value.duration
  })
  audio.value.addEventListener('timeupdate', () => {
    currentTime.value = audio.value.currentTime
  })
}

const loadPlaylistSongs = (songs, pl, plId) => {
  playlist.value = pl
  playlistId.value = plId
  originalOrder.value = songs
  displaySongs.value = [...songs]
  shuffled.value = JSON.parse(localStorage.getItem(`playlist_${plId}_shuffled`) || 'false')
  if (shuffled.value) {
    shuffleOrder()
  }
}

const shuffleOrder = () => {
  const arr = [...displaySongs.value]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const currentSongId = displaySongs.value[currentIndex.value]?.id
  displaySongs.value = arr
  currentIndex.value = displaySongs.value.findIndex(s => s.id === currentSongId)
}

const playSong = (index) => {
  currentIndex.value = index
  playing.value = true
  currentTime.value = 0
  if (audio.value) {
    audio.value.src = `/api/music/${displaySongs.value[index].id}/file?t=${Date.now()}`
    audio.value.load()
    audio.value.play().catch(() => {})
  }
}

const togglePlay = () => {
  if (!audio.value) return
  playing.value = !playing.value
  if (playing.value) {
    audio.value.play().catch(() => {})
  } else {
    audio.value.pause()
  }
}

const next = () => {
  if (currentIndex.value < displaySongs.value.length - 1) {
    playSong(currentIndex.value + 1)
  } else if (repeat.value) {
    playSong(0)
  }
}

const prev = () => {
  if (audio.value && audio.value.currentTime > 3) {
    audio.value.currentTime = 0
  } else if (currentIndex.value > 0) {
    playSong(currentIndex.value - 1)
  }
}

const toggleRepeat = () => { repeat.value = !repeat.value }

const toggleShuffle = () => {
  shuffled.value = !shuffled.value
  if (playlistId.value) {
    localStorage.setItem(`playlist_${playlistId.value}_shuffled`, shuffled.value.toString())
  }
  if (shuffled.value) {
    shuffleOrder()
  } else {
    const currentSongId = displaySongs.value[currentIndex.value]?.id
    displaySongs.value = [...originalOrder.value]
    currentIndex.value = displaySongs.value.findIndex(s => s.id === currentSongId)
  }
}

const playFirst = () => {
  if (shuffled.value) {
    shuffled.value = false
    if (playlistId.value) {
      localStorage.setItem(`playlist_${playlistId.value}_shuffled`, 'false')
    }
    displaySongs.value = [...originalOrder.value]
    currentIndex.value = 0
  }
  if (displaySongs.value.length > 0) playSong(0)
}

const shufflePlay = () => {
  if (!shuffled.value) {
    shuffled.value = true
    if (playlistId.value) {
      localStorage.setItem(`playlist_${playlistId.value}_shuffled`, 'true')
    }
    shuffleOrder()
  }
  if (displaySongs.value.length > 0) playSong(0)
}

const isCurrentPlaylist = (plId) => {
  return playlistId.value === plId
}

const currentSong = computed(() => {
  if (displaySongs.value.length === 0) return null
  return currentIndex.value >= 0 ? displaySongs.value[currentIndex.value] : displaySongs.value[0]
})

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const cleanTitle = (title) => {
  if (!title) return title
  return title.replace(/\s*\[[^\]]+\]\s*$/, '')
}

const stop = () => {
  if (audio.value) {
    audio.value.pause()
    audio.value.src = ''
  }
  playing.value = false
  currentIndex.value = -1
}

export function useMusicPlayer() {
  if (!initialized.value) init()
  return {
    audio,
    playlist,
    playlistId,
    displaySongs,
    currentIndex,
    shuffled,
    repeat,
    playing,
    currentTime,
    duration,
    currentSong,
    playSong,
    togglePlay,
    next,
    prev,
    toggleRepeat,
    toggleShuffle,
    playFirst,
    shufflePlay,
    loadPlaylistSongs,
    isCurrentPlaylist,
    formatTime,
    cleanTitle,
    stop,
    init
  }
}
