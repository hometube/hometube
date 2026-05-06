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
let audioContext = null
let analyser = null
let dataArray = null

const getAnalyser = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    if (audio.value) {
      const source = audioContext.createMediaElementSource(audio.value)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
    }
    dataArray = new Uint8Array(analyser.frequencyBinCount)
  }
  return { analyser, dataArray, audioContext }
}

const saveState = () => {
  if (!audio.value || currentIndex.value < 0) return
  const state = {
    playlistId: playlistId.value,
    currentIndex: currentIndex.value,
    shuffled: shuffled.value,
    repeat: repeat.value,
    playing: playing.value,
    currentTime: audio.value.currentTime,
    duration: audio.value.duration
  }
  localStorage.setItem('musicPlayerState', JSON.stringify(state))
}

const restoreState = async () => {
  const saved = localStorage.getItem('musicPlayerState')
  if (!saved) return false

  try {
    const state = JSON.parse(saved)
    if (!state.playlistId || state.currentIndex < 0) return false

    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (!user || !user.id) return false

    let pl = null
    let songs = []

    if (state.playlistId === 'my-songs') {
      const allSongs = await API.get('/music', { user_id: user.id })
      pl = { type: 'virtual', name: 'My Songs' }
      songs = allSongs.filter(m => m.added_by === user.id)
    } else if (state.playlistId === 'all-songs') {
      const allSongs = await API.get('/music', { user_id: user.id })
      pl = { type: 'virtual', name: 'All Songs' }
      songs = allSongs
    } else {
      const playlists = await API.get('/playlists', { user_id: user.id })
      const found = playlists.find(p => p.id === parseInt(state.playlistId))
      if (found) {
        pl = found
        const allMusic = await API.get('/music', { user_id: user.id })
        songs = (found.songs || [])
          .map(s => allMusic.find(m => m.id === s.music_id))
          .filter(Boolean)
      }
    }

    if (!pl || songs.length === 0) return false

    playlist.value = pl
    playlistId.value = state.playlistId
    originalOrder.value = songs
    displaySongs.value = [...songs]
    shuffled.value = state.shuffled
    repeat.value = state.repeat

    if (shuffled.value) {
      shuffleOrder()
    }

    currentIndex.value = state.currentIndex

    if (audio.value && currentIndex.value >= 0 && displaySongs.value[currentIndex.value]) {
      audio.value.src = `/api/music/${displaySongs.value[currentIndex.value].id}/file`
      audio.value.load()
      audio.value.currentTime = state.currentTime || 0
      currentTime.value = state.currentTime || 0
      duration.value = state.duration || 0

      if (state.playing) {
        audio.value.play().catch(() => {})
        playing.value = true
      }
    }

    return true
  } catch (e) {
    console.error('Failed to restore music player state:', e)
    return false
  }
}

const init = () => {
  if (initialized.value) return
  initialized.value = true
  audio.value = new Audio()

  window.addEventListener('beforeunload', saveState)

  audio.value.addEventListener('ended', () => {
    if (currentIndex.value < displaySongs.value.length - 1) {
      playSong(currentIndex.value + 1, false)
    } else if (repeat.value) {
      playSong(0, false)
    } else {
      playing.value = false
      saveState()
    }
  })
  audio.value.addEventListener('loadedmetadata', () => {
    duration.value = audio.value.duration
  })
  audio.value.addEventListener('timeupdate', () => {
    currentTime.value = audio.value.currentTime
  })
  audio.value.addEventListener('pause', () => {
  })
  audio.value.addEventListener('play', () => {
  })
}

const loadPlaylistSongs = (songs, pl, plId) => {
  const wasPlaying = playing.value && currentIndex.value >= 0
  const currentSongId = wasPlaying ? displaySongs.value[currentIndex.value]?.id : null

  playlist.value = pl
  playlistId.value = plId
  originalOrder.value = songs
  displaySongs.value = [...songs]
  shuffled.value = JSON.parse(localStorage.getItem(`playlist_${plId}_shuffled`) || 'false')

  if (shuffled.value) {
    shuffleOrder()
  }

  // If we were playing a song from this playlist, try to restore playback position
  if (wasPlaying && currentSongId) {
    const newIndex = displaySongs.value.findIndex(s => s.id === currentSongId)
    if (newIndex >= 0) {
      currentIndex.value = newIndex
    }
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

const playSong = (index, reloadAudio = true) => {
  currentIndex.value = index
  playing.value = true
  if (audio.value) {
    if (reloadAudio) {
      currentTime.value = 0
      audio.value.src = `/api/music/${displaySongs.value[index].id}/file?t=${Date.now()}`
      audio.value.load()
    }
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
    init,
    restoreState
  }
}
