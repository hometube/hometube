import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API } from '../api.js'
import { useUserStore } from './user.js'

export const useMusicStore = defineStore('music', () => {
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
  const playbackError = ref(null)

  const updateMediaSession = (song) => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown',
      artist: song.artist || 'Unknown',
      album: playlist.value?.name || '',
      artwork: song.album_art
        ? [{ src: song.album_art, sizes: '512x512', type: 'image/jpeg' }]
        : []
    })
  }

  const updatePositionState = () => {
    if ('mediaSession' in navigator && duration.value > 0) {
      navigator.mediaSession.setPositionState({
        duration: duration.value,
        playbackRate: 1,
        position: currentTime.value
      })
    }
  }

  const isOffline = computed(() => {
    const userStore = useUserStore()
    return userStore.checked && !userStore.online
  })

  const findNextIndex = (forward = true) => {
    if (forward) {
      const start = currentIndex.value + 1
      for (let i = start; i < displaySongs.value.length; i++) {
        if (!isOffline.value || displaySongs.value[i].downloaded) return i
      }
      if (repeat.value) {
        for (let i = 0; i < currentIndex.value; i++) {
          if (!isOffline.value || displaySongs.value[i].downloaded) return i
        }
      }
    } else {
      const start = currentIndex.value - 1
      for (let i = start; i >= 0; i--) {
        if (!isOffline.value || displaySongs.value[i].downloaded) return i
      }
      if (repeat.value) {
        for (let i = displaySongs.value.length - 1; i > currentIndex.value; i--) {
          if (!isOffline.value || displaySongs.value[i].downloaded) return i
        }
      }
    }
    return -1
  }

  const hasActiveQueue = computed(() => displaySongs.value.length > 0)

  const isInQueue = (songId) => displaySongs.value.some(s => s.id === songId)

  const addToQueueNext = (song) => {
    displaySongs.value.splice(currentIndex.value + 1, 0, { ...song })
  }

  const addToQueue = (song) => {
    if (isInQueue(song.id)) return
    displaySongs.value.push({ ...song })
  }

  const removeFromQueue = (songId) => {
    displaySongs.value = displaySongs.value.filter(s => s.id !== songId)
  }

  const playlists = ref([])
  const songs = ref([])

  const downloadedCache = ref({})

  const checkDownloaded = async (songs) => {
    const paths = songs.map(s => `/api/music/${s.id}/file`)
    try {
      const status = await API.checkCache(paths)
      downloadedCache.value = Object.fromEntries(
        songs.map(s => [s.id, !!status[`/api/music/${s.id}/file`]])
      )
      displaySongs.value = displaySongs.value.map(s => ({
        ...s,
        downloaded: downloadedCache.value[s.id] || false
      }))
    } catch {}
  }

  const mySongs = computed(() => songs.value.filter(m => m.added_by === useUserStore().user?.id))

  const virtualPlaylists = computed(() => [
    { id: 'my-songs', name: 'My Songs', songs: mySongs.value },
    { id: 'all-songs', name: 'All Songs', songs: songs.value }
  ])

  const load = async () => {
    const userStore = useUserStore()
    if (!userStore.user) return
    try {
      const [pls, allSongs] = await Promise.all([
        API.get('/playlists', { user_id: userStore.user.id }),
        API.get('/music', { user_id: userStore.user.id })
      ])
      playlists.value = pls
      songs.value = allSongs
    } catch (e) {
      console.error('Failed to load music data:', e)
    }
  }

  let audioContext = null
  let analyser = null
  let dataArray = null

  const currentSong = computed(() => {
    if (displaySongs.value.length === 0) return null
    return currentIndex.value >= 0 ? displaySongs.value[currentIndex.value] : displaySongs.value[0]
  })

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

      if (!downloadedCache.value || Object.keys(downloadedCache.value).length === 0) {
        await checkDownloaded(songs)
      }

      displaySongs.value = songs.map(s => ({
        ...s,
        downloaded: downloadedCache.value[s.id] || false
      }))
      shuffled.value = state.shuffled
      repeat.value = state.repeat

      if (shuffled.value) {
        shuffleOrder()
      }

      currentIndex.value = state.currentIndex

      if (audio.value && currentIndex.value >= 0 && displaySongs.value[currentIndex.value]) {
        const song = displaySongs.value[currentIndex.value]
        const url = await API.getMusicUrl(song)
        if (!url) {
          console.warn('[MusicStore] restoreState: no URL for saved song', {
            songId: song.id, title: song.title, filename: song.filename, video_id: song.video_id
          })
          return false
        }
        audio.value.src = url
        audio.value.load()
        audio.value.currentTime = state.currentTime || 0
        currentTime.value = state.currentTime || 0
        duration.value = state.duration || 0

        if (state.playing) {
          audio.value.play().catch(() => {})
          playing.value = true
          updateMediaSession(song)
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

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (!playing.value) togglePlay()
      })
      navigator.mediaSession.setActionHandler('pause', () => {
        if (playing.value) togglePlay()
      })
      navigator.mediaSession.setActionHandler('nexttrack', () => next())
      navigator.mediaSession.setActionHandler('previoustrack', () => prev())
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && audio.value) {
          audio.value.currentTime = details.seekTime
        }
      })
    }

    audio.value.addEventListener('ended', () => {
      const idx = findNextIndex(true)
      if (idx >= 0) {
        playSong(idx)
      } else {
        playing.value = false
        saveState()
      }
    })
    audio.value.addEventListener('loadedmetadata', () => {
      duration.value = audio.value.duration
      playbackError.value = null
      updatePositionState()
    })
    audio.value.addEventListener('error', () => {
      playing.value = false
      currentTime.value = 0
      duration.value = 0
      playbackError.value = 'Failed to load song'
    })
    audio.value.addEventListener('play', () => {
      playbackError.value = null
    })
    audio.value.addEventListener('timeupdate', () => {
      currentTime.value = audio.value.currentTime
      updatePositionState()
    })
  }

  const loadSettings = () => { try { return JSON.parse(localStorage.getItem('settings') || '{}') } catch { return {} } }

  const loadPlaylistSongs = (songs, pl, plId) => {
    const wasPlaying = playing.value && currentIndex.value >= 0
    const currentSongId = wasPlaying ? displaySongs.value[currentIndex.value]?.id : null
    const s = loadSettings()

    currentIndex.value = -1
    playlist.value = pl
    playlistId.value = plId
    originalOrder.value = songs
    displaySongs.value = songs.map(s => ({
      ...s,
      downloaded: downloadedCache.value[s.id] || false
    }))
    shuffled.value = JSON.parse(localStorage.getItem(`playlist_${plId}_shuffled`) || String(!!s.defaultShuffle))
    repeat.value = !!s.defaultRepeat

    if (shuffled.value) {
      shuffleOrder()
    }

    if (wasPlaying && currentSongId) {
      const newIndex = displaySongs.value.findIndex(s => s.id === currentSongId)
      if (newIndex >= 0) {
        currentIndex.value = newIndex
      }
    }

    checkDownloaded(songs)
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

  const playSong = async (index, reloadAudio = true) => {
    if (!Object.keys(downloadedCache.value).length) {
      await checkDownloaded(displaySongs.value)
    }

    currentIndex.value = index

    const song = displaySongs.value[index]
    if (!song) return
    playing.value = true

    if (audio.value && reloadAudio) {
      currentTime.value = 0
      const url = await API.getMusicUrl(song)
      if (!url) {
        playing.value = false
        duration.value = 0
        const reason = !song.filename && !song.video_id
          ? 'missing filename and video_id'
          : 'no matching file blob in local storage'
        playbackError.value = `Cannot play "${song.title || 'Unknown'}": ${reason}`
        console.warn('[MusicStore] playSong: no URL available for song', {
          songId: song.id, title: song.title, artist: song.artist,
          filename: song.filename, video_id: song.video_id,
          downloaded: song.downloaded, reason
        })
        return
      }
      audio.value.src = url
      audio.value.load()
    }
    audio.value.play().catch(() => {})

    updateMediaSession(song)

    if (!song.downloaded) {
      try {
        const s = JSON.parse(localStorage.getItem('settings') || '{}')
        if (s.downloadOnPlay !== false) {
          API.cache(`/music/${song.id}/file`, { ttl: Infinity, refetch: false }, false)
          const idx = displaySongs.value.findIndex(s => s.id === song.id)
          if (idx >= 0) displaySongs.value[idx].downloaded = true
          if (downloadedCache.value) downloadedCache.value[song.id] = true
        }
      } catch {}
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
    const idx = findNextIndex(true)
    if (idx >= 0) playSong(idx)
  }

  const prev = () => {
    if (audio.value && audio.value.currentTime > 3) {
      audio.value.currentTime = 0
      return
    }
    const idx = findNextIndex(false)
    if (idx >= 0) playSong(idx)
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

  const findFirstPlayable = () => {
    for (let i = 0; i < displaySongs.value.length; i++) {
      if (!isOffline.value || displaySongs.value[i].downloaded) return i
    }
    return -1
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
    const idx = findFirstPlayable()
    if (idx >= 0) playSong(idx)
  }

  const shufflePlay = () => {
    if (!shuffled.value) {
      shuffled.value = true
      if (playlistId.value) {
        localStorage.setItem(`playlist_${playlistId.value}_shuffled`, 'true')
      }
      shuffleOrder()
    }
    const idx = findFirstPlayable()
    if (idx >= 0) playSong(idx)
  }

  const isCurrentPlaylist = (plId) => {
    return playlistId.value === plId
  }

  const stop = () => {
    if (audio.value) {
      audio.value.pause()
      audio.value.src = ''
    }
    playing.value = false
    currentIndex.value = -1
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const dismissError = () => {
    playbackError.value = null
  }

  const cleanTitle = (title) => {
    if (!title) return title
    return title.replace(/\s*\[[^\]]+\]\s*$/, '')
  }

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
    initialized,
    playbackError,
    currentSong,
    playlists,
    songs,
    mySongs,
    virtualPlaylists,
    hasActiveQueue,
    isInQueue,
    addToQueueNext,
    addToQueue,
    removeFromQueue,
    getAnalyser,
    saveState,
    restoreState,
    init,
    load,
    loadPlaylistSongs,
    checkDownloaded,
    shuffleOrder,
    playSong,
    togglePlay,
    next,
    prev,
    toggleRepeat,
    toggleShuffle,
    playFirst,
    shufflePlay,
    isCurrentPlaylist,
    stop,
    formatTime,
    cleanTitle,
    dismissError
  }
})
