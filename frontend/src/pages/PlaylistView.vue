<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WaveformVisual from '../components/WaveformVisual.vue'

const props = defineProps(['user'])
const router = useRouter()
const route = useRoute()

const playlist = ref(null)
const displaySongs = ref([])
const originalOrder = ref([])
const currentIndex = ref(-1)
const shuffled = ref(false)
const repeat = ref(false)
const playing = ref(false)
const audio = ref(null)
const currentTime = ref(0)
const duration = ref(0)

const loadPlaylist = async () => {
  const { id } = route.params
  if (!id || !props.user) return

  if (id === 'my-songs') {
    const songs = await API.get('/music', { user_id: props.user.id })
    playlist.value = { type: 'virtual', name: 'My Songs' }
    originalOrder.value = songs.filter(m => m.added_by === props.user.id)
  } else if (id === 'all-songs') {
    const songs = await API.get('/music', { user_id: props.user.id })
    playlist.value = { type: 'virtual', name: 'All Songs' }
    originalOrder.value = songs
  } else {
    const playlists = await API.get('/playlists', { user_id: props.user.id })
    const pl = playlists.find(p => p.id === parseInt(id))
    if (pl) {
      playlist.value = pl
      const allMusic = await API.get('/music', { user_id: props.user.id })
      originalOrder.value = (pl.songs || [])
        .map(s => allMusic.find(m => m.id === s.music_id))
        .filter(Boolean)
    }
  }

  displaySongs.value = [...originalOrder.value]
  shuffled.value = JSON.parse(localStorage.getItem(`playlist_${id}_shuffled`) || 'false')
  if (shuffled.value) shuffleOrder()
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

const getPlaylistId = () => {
  const { id } = route.params
  return id || 'unknown'
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

const playFirst = () => {
  if (shuffled.value) {
    shuffled.value = false
    localStorage.setItem(`playlist_${getPlaylistId()}_shuffled`, 'false')
    displaySongs.value = [...originalOrder.value]
    currentIndex.value = 0
  }
  if (displaySongs.value.length > 0) playSong(0)
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

const toggleShuffle = () => {
  shuffled.value = !shuffled.value
  localStorage.setItem(`playlist_${getPlaylistId()}_shuffled`, shuffled.value.toString())
  if (shuffled.value) {
    shuffleOrder()
  } else {
    const currentSongId = displaySongs.value[currentIndex.value]?.id
    displaySongs.value = [...originalOrder.value]
    currentIndex.value = displaySongs.value.findIndex(s => s.id === currentSongId)
  }
}

const toggleRepeat = () => { repeat.value = !repeat.value }

const currentSong = computed(() => {
  if (displaySongs.value.length === 0) return null
  return currentIndex.value >= 0 ? displaySongs.value[currentIndex.value] : displaySongs.value[0]
})

const cleanTitle = (title) => {
  if (!title) return title
  return title.replace(/\s*\[[^\]]+\]\s*$/, '')
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const seekTo = (event) => {
  if (!audio.value || !duration.value) return
  const percent = event.offsetX / event.target.clientWidth
  audio.value.currentTime = percent * duration.value
}

const shufflePlay = () => {
  if (!shuffled.value) {
    shuffled.value = true
    localStorage.setItem(`playlist_${getPlaylistId()}_shuffled`, 'true')
    shuffleOrder()
  }
  if (displaySongs.value.length > 0) playSong(0)
}

const addToPlaylist = async (musicId, targetPlaylistId) => {
  await API.post(`/playlists/${targetPlaylistId}/add`, { music_id: musicId })
}

const removeFromPlaylist = async (musicId) => {
  if (!playlist.value) return
  await API.delete(`/playlists/${playlist.value.id}/remove/${musicId}`)
  loadPlaylist()
}

const close = () => {
  if (audio.value) {
    audio.value.pause()
    audio.value.src = ''
  }
  router.push('/music')
}

onMounted(() => {
  audio.value = new Audio()
  audio.value.addEventListener('ended', next)
  audio.value.addEventListener('loadedmetadata', () => {
    duration.value = audio.value.duration
  })
  audio.value.addEventListener('timeupdate', () => {
    currentTime.value = audio.value.currentTime
  })
  loadPlaylist()
})

watch(() => route.params.id, () => {
  loadPlaylist()
})

onUnmounted(() => {
  if (audio.value) {
    audio.value.pause()
    audio.value.src = ''
  }
})
</script>

<template>
  <div class="fixed top-12 inset-0 bg-gray-900 z-50 flex flex-col">
    <div class="flex-1 overflow-hidden relative">
      <WaveformVisual :audioElement="audio" :playing="playing" />
      <div class="relative z-10 h-full overflow-y-auto pb-24">
        <div class="p-4 py-8">
          <div class="font-bold text-lg text-center mb-4">{{ playlist?.name || 'Songs' }}</div>
          <div class="flex items-center justify-center gap-2 mb-6">
            <button @click="close" class="w-32 bg-gray-700 text-white py-2 rounded-full text-center text-sm font-medium">
              <FontAwesomeIcon :icon="['fas', 'arrow-left']" class="mr-2" />Back
            </button>
            <button @click="playFirst" class="w-32 py-2 bg-white text-black rounded-full text-center text-sm font-medium">
              <FontAwesomeIcon :icon="['fas', 'play']" class="mr-2" />Play
            </button>
            <button @click="shufflePlay" class="w-32 py-2 bg-gray-700 text-white rounded-full text-center text-sm font-medium">
              <FontAwesomeIcon :icon="['fas', 'random']" class="mr-2" />Shuffle
            </button>
          </div>
        </div>

        <div class="p-4">
          <div v-for="(s, idx) in displaySongs" :key="s.id"
            class="flex items-center gap-3 p-3 rounded hover:bg-gray-800 cursor-pointer"
            :class="{ 'bg-gray-800': idx === currentIndex }"
            @click="playSong(idx)">
            <img v-if="s.album_art" :src="s.album_art" class="w-10 h-10 rounded object-cover" />
            <div class="flex-1">
              <div class="text-sm">{{ cleanTitle(s.title) }}</div>
              <div class="text-xs text-gray-400">{{ s.artist }}</div>
            </div>
            <button v-if="playlist && playlist.type !== 'virtual'" @click.stop="removeFromPlaylist(s.id)" class="text-gray-400">
              <FontAwesomeIcon :icon="['fas', 'ellipsis-v']" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentIndex >= 0" class="fixed bottom-0 left-0 right-0 bg-gray-800/70 backdrop-blur-sm border-t border-gray-700 p-2 z-50">
      <div class="text-center mb-2">
        <span class="text-sm font-medium truncate">{{ cleanTitle(currentSong.title) }}</span>
        •
        <span class="text-xs text-gray-400 truncate">{{ currentSong.artist }}</span>
      </div>
      <div class="flex items-center justify-center gap-10">
        <button @click="prev" class="text-white"><FontAwesomeIcon :icon="['fas', 'backward']" /></button>
        <button @click="togglePlay" class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
          <FontAwesomeIcon :icon="['fas', playing ? 'pause' : 'play']" />
        </button>
        <button @click="next" class="text-white"><FontAwesomeIcon :icon="['fas', 'forward']" /></button>
      </div>
    </div>
  </div>
</template>
