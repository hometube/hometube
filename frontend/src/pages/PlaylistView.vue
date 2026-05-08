<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useUserStore } from '../stores/user.js'
import { useMusicStore } from '../stores/music.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const musicStore = useMusicStore()

const {
  playlist,
  playlistId,
  displaySongs,
  currentIndex,
  shuffled,
  playing,
  audio,
  currentTime,
  duration,
  currentSong,
  playSong,
  togglePlay,
  next,
  prev,
  toggleRepeat,
  playFirst,
  shufflePlay,
  loadPlaylistSongs,
  isCurrentPlaylist,
  formatTime,
  cleanTitle,
  stop
} = musicStore

const getPlaylistId = () => {
  const { id } = route.params
  return id || 'unknown'
}

const loadPlaylist = async () => {
  const { id } = route.params
  if (!id || !userStore.user) return

  let pl = null
  let songs = []

  if (id === 'my-songs') {
    const allSongs = await API.get('/music', { user_id: userStore.user.id })
    pl = { type: 'virtual', name: 'My Songs' }
    songs = allSongs.filter(m => m.added_by === userStore.user.id)
  } else if (id === 'all-songs') {
    const allSongs = await API.get('/music', { user_id: userStore.user.id })
    pl = { type: 'virtual', name: 'All Songs' }
    songs = allSongs
  } else {
    const playlists = await API.get('/playlists', { user_id: userStore.user.id })
    const found = playlists.find(p => p.id === parseInt(id))
    if (found) {
      pl = found
      const allMusic = await API.get('/music', { user_id: userStore.user.id })
      songs = (found.songs || [])
        .map(s => allMusic.find(m => m.id === s.music_id))
        .filter(Boolean)
    }
  }

  if (pl) {
    loadPlaylistSongs(songs, pl, id)
  }
}

const removeFromPlaylist = async (musicId) => {
  if (!playlist.value || playlist.value.type === 'virtual') return
  await API.delete(`/playlists/${playlist.value.id}/remove/${musicId}`)
  loadPlaylist()
}

const close = () => {
  router.push('/music')
}

onMounted(() => {
  loadPlaylist()
})

watch(() => route.params.id, () => {
  loadPlaylist()
})
</script>

<template>
  <div class="fixed top-12 inset-0 bg-gray-900 z-50 flex flex-col">
    <div class="flex-1 overflow-hidden relative">
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
  </div>
</template>
