<script>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  components: { FontAwesomeIcon },
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
    const timeUpdateInterval = ref(null)
    const canvas = ref(null)
    let animFrameId = null
    let audioContext = null
    let analyser = null
    let dataArray = null

    const initVisualization = () => {
      if (!canvas.value || !audio.value) return
      const ctx = canvas.value.getContext('2d')
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        const source = audioContext.createMediaElementSource(audio.value)
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        dataArray = new Uint8Array(analyser.frequencyBinCount)
      }
      drawWaveform(ctx)
    }

    const drawWaveform = (ctx) => {
      if (!analyser || !playing.value) return
      animFrameId = requestAnimationFrame(() => drawWaveform(ctx))
      analyser.getByteFrequencyData(dataArray)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
      const barWidth = canvas.value.width / dataArray.length * 2.5
      let barHeight
      let x = 0
      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.value.height * 0.8
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(x, canvas.value.height - barHeight, barWidth - 1, barHeight)
        x += barWidth
      }
    }

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
        [arr[i], arr[j]] = [arr[j], arr[i]]
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
        setTimeout(() => initVisualization(), 100)
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
        if (audioContext && audioContext.state === 'suspended') audioContext.resume()
        setTimeout(() => initVisualization(), 100)
      } else {
        audio.value.pause()
        if (animFrameId) cancelAnimationFrame(animFrameId)
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
      if (animFrameId) cancelAnimationFrame(animFrameId)
      if (audioContext) {
        audioContext.close()
        audioContext = null
      }
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
      addToPlaylist, removeFromPlaylist, close, canvas
    }
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 z-50 flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <button @click="close" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <span class="font-bold">{{ playlist?.name || 'Songs' }}</span>
      <div></div>
    </div>

    <div class="p-4 text-center">
      <canvas ref="canvas" width="200" height="200" class="w-48 h-48 rounded-lg mx-auto mb-4 bg-gray-800"></canvas>
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

    <div class="flex-1 overflow-y-auto p-4">
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
</template>
