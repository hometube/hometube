<script>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WaveformVisual from '../components/WaveformVisual.vue'

export default {
  components: { FontAwesomeIcon, WaveformVisual },
  props: ['playlist', 'user', 'songs'],
  setup(props, { emit }) {
    const displaySongs = ref([])
    const originalOrder = ref([])
    const currentIndex = ref(-1)
    const shuffled = ref(false)
    const repeat = ref(false)
    const playing = ref(false)
    const audio = ref(null)
    const currentTime = ref(0)
    const duration = ref(0)

    const loadSongs = async () => {
      let musicList = props.songs
      if (!musicList && props.playlist) {
        const allMusic = await API.get('/music', { user_id: props.user.id })
        musicList = (props.playlist.songs || [])
          .map(s => allMusic.find(m => m.id === s.music_id))
          .filter(Boolean)
      }
      if (!musicList) return
      originalOrder.value = [...musicList]
      displaySongs.value = [...musicList]
      shuffled.value = JSON.parse(localStorage.getItem(`playlist_${props.playlist?.id}_shuffled`) || 'false')
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
      if (props.playlist) {
        localStorage.setItem(`playlist_${props.playlist.id}_shuffled`, shuffled.value.toString())
      }
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

    const addToPlaylist = async (musicId, targetPlaylistId) => {
      await API.post(`/playlists/${targetPlaylistId}/add`, { music_id: musicId })
    }

    const removeFromPlaylist = async (musicId) => {
      if (!props.playlist) return
      await API.delete(`/playlists/${props.playlist.id}/remove/${musicId}`)
      loadSongs()
    }

    const close = () => {
      if (audio.value) {
        audio.value.pause()
        audio.value.src = ''
      }
      emit('close')
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
      loadSongs()
    })

    onUnmounted(() => {
      if (audio.value) {
        audio.value.pause()
        audio.value.src = ''
      }
    })

    return {
      displaySongs, currentIndex, shuffled, repeat, playing, currentSong,
      currentTime, duration, formatTime, cleanTitle,
      playSong, playFirst, togglePlay, next, prev,
      toggleShuffle, toggleRepeat, seekTo,
      addToPlaylist, removeFromPlaylist, close, audio, playing
    }
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 z-50 flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-gray-700 relative z-10">
      <button @click="close" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <span class="font-bold">{{ playlist?.name || 'Songs' }}</span>
      <div></div>
    </div>

    <div class="flex-1 overflow-hidden relative">
      <WaveformVisual :audioElement="audio" :playing="playing" />
      <div class="relative z-10 h-full overflow-y-auto">
        <div class="p-4 text-center">
          <div v-if="currentSong" class="font-medium">{{ cleanTitle(currentSong.title) }}</div>
          <div v-if="currentSong" class="text-sm text-gray-400">{{ currentSong.artist }}</div>
        </div>

        <div v-if="currentIndex >= 0" class="px-4">
          <div class="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>{{ formatTime(currentTime) }}</span>
            <div class="flex-1 bg-gray-700 rounded-full h-1 cursor-pointer" @click="seekTo">
              <div class="bg-blue-500 h-1 rounded-full" :style="{ width: duration ? (currentTime / duration * 100) + '%' : '0%' }"></div>
            </div>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-center gap-6 p-4">
          <button @click="prev" class="text-white"><FontAwesomeIcon :icon="['fas', 'backward']" /></button>
          <button @click="togglePlay" class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
            <FontAwesomeIcon :icon="['fas', playing ? 'pause' : 'play']" />
          </button>
          <button @click="next" class="text-white"><FontAwesomeIcon :icon="['fas', 'forward']" /></button>
        </div>

        <div class="flex items-center justify-center gap-6 p-4">
          <button @click="toggleShuffle" :class="shuffled ? 'text-blue-500' : 'text-gray-400'">
            <FontAwesomeIcon :icon="['fas', 'random']" />
          </button>
          <button @click="toggleRepeat" :class="repeat ? 'text-blue-500' : 'text-gray-400'">
            <FontAwesomeIcon :icon="['fas', 'redo']" />
          </button>
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
            <button v-if="playlist" @click.stop="removeFromPlaylist(s.id)" class="text-gray-400">
              <FontAwesomeIcon :icon="['fas', 'ellipsis-v']" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
