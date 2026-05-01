<script>
import { ref, onMounted, computed } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  components: { FontAwesomeIcon },
  props: ['playlist', 'user'],
  setup(props, { emit }) {
    const songs = ref([])
    const currentIndex = ref(0)
    const shuffled = ref(false)
    const repeat = ref(false)
    const playing = ref(false)
    const audio = ref(null)

    const loadSongs = async () => {
      if (!props.playlist?.songs?.length) return
      const allMusic = await API.get('/music', { user_id: props.user.id })
      songs.value = (props.playlist.songs || [])
        .map(s => allMusic.find(m => m.id === s.music_id))
        .filter(Boolean)
    }

    const playSong = (index) => {
      currentIndex.value = index
      playing.value = true
      if (audio.value) {
        audio.value.src = `/api/files/music/${songs.value[index].id}.mp3`
        audio.value.play()
      }
    }

    const togglePlay = () => {
      if (!audio.value) return
      playing.value = !playing.value
      playing.value ? audio.value.play() : audio.value.pause()
    }

    const next = () => {
      if (currentIndex.value < songs.value.length - 1) playSong(currentIndex.value + 1)
      else if (repeat.value) playSong(0)
    }

    const prev = () => {
      if (currentIndex.value > 0) playSong(currentIndex.value - 1)
    }

    const toggleShuffle = () => { shuffled.value = !shuffled.value }
    const toggleRepeat = () => { repeat.value = !repeat.value }

    const currentSong = computed(() => songs.value[currentIndex.value])

    const addToPlaylist = async (musicId, targetPlaylistId) => {
      await API.post(`/playlists/${targetPlaylistId}/add`, { music_id: musicId })
    }

    const removeFromPlaylist = async (musicId) => {
      await API.delete(`/playlists/${props.playlist.id}/remove/${musicId}`)
      loadSongs()
    }

    onMounted(() => {
      audio.value = new Audio()
      audio.value.addEventListener('ended', next)
      loadSongs()
    })

    return { songs, currentIndex, shuffled, repeat, playing, currentSong, playSong, togglePlay, next, prev, toggleShuffle, toggleRepeat, addToPlaylist, removeFromPlaylist }
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 z-50 flex flex-col" v-if="playlist">
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <button @click="$emit('close')" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <span class="font-bold">{{ playlist.name }}</span>
      <div></div>
    </div>

    <div class="p-4 text-center" v-if="currentSong">
      <img :src="currentSong.album_art" class="w-48 h-48 rounded-lg object-cover mx-auto mb-4" />
      <div class="font-medium">{{ currentSong.title }}</div>
      <div class="text-sm text-gray-400">{{ currentSong.artist }}</div>
    </div>

    <div class="flex items-center justify-center gap-6 p-4">
      <button @click="toggleShuffle" :class="shuffled ? 'text-blue-500' : 'text-gray-400'">
        <FontAwesomeIcon :icon="['fas', 'random']" />
      </button>
      <button @click="prev" class="text-white"><FontAwesomeIcon :icon="['fas', 'backward']" /></button>
      <button @click="togglePlay" class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
        <FontAwesomeIcon :icon="['fas', playing ? 'pause' : 'play']" />
      </button>
      <button @click="next" class="text-white"><FontAwesomeIcon :icon="['fas', 'forward']" /></button>
      <button @click="toggleRepeat" :class="repeat ? 'text-blue-500' : 'text-gray-400'">
        <FontAwesomeIcon :icon="['fas', 'redo']" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-for="(s, idx) in songs" :key="s.id"
        class="flex items-center gap-3 p-3 rounded hover:bg-gray-800 cursor-pointer"
        @click="playSong(idx)">
        <img v-if="s.album_art" :src="s.album_art" class="w-10 h-10 rounded object-cover" />
        <div class="flex-1">
          <div class="text-sm">{{ s.title }}</div>
          <div class="text-xs text-gray-400">{{ s.artist }}</div>
        </div>
        <button @click.stop="removeFromPlaylist(s.id)" class="text-gray-400">
          <FontAwesomeIcon :icon="['fas', 'ellipsis-v']" />
        </button>
      </div>
    </div>
  </div>
</template>
