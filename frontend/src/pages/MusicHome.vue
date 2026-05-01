<script>
import { ref, onMounted, watch } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  components: { FontAwesomeIcon },
  props: ['user'],
  setup(props, { emit }) {
    const playlists = ref([])
    const songs = ref([])
    const showAll = ref(false)

    const load = async () => {
      if (!props.user) return
      const [pls, allSongs] = await Promise.all([
        API.get('/playlists', { user_id: props.user.id }),
        API.get('/music', { user_id: props.user.id })
      ])
      playlists.value = pls
      songs.value = allSongs
    }

    const selectPlaylist = (playlist) => {
      emit('open-playlist', playlist)
    }

    watch(() => props.user, load, { immediate: true })
    onMounted(load)

    return { playlists, songs, showAll, selectPlaylist }
  }
}
</script>

<template>
  <div class="p-4 pt-16" v-if="user">
    <div class="flex gap-2 mb-4">
      <button @click="showAll = false" :class="['px-3 py-1 rounded-full text-sm', !showAll ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300']">My Songs</button>
      <button @click="showAll = true" :class="['px-3 py-1 rounded-full text-sm', showAll ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300']">All Songs</button>
    </div>

    <div class="mb-4">
      <h3 class="text-sm text-gray-400 uppercase mb-2">Playlists</h3>
      <div v-for="pl in playlists" :key="pl.id" @click="selectPlaylist(pl)"
        class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-700">
        <div class="font-medium">{{ pl.name }}</div>
        <div class="text-xs text-gray-400">{{ (pl.songs || []).length }} songs</div>
      </div>
      <button @click="$emit('navigate', 'add')" class="w-full p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 text-sm">
        <FontAwesomeIcon :icon="['fas', 'plus']" /> New Playlist
      </button>
    </div>

    <div>
      <h3 class="text-sm text-gray-400 uppercase mb-2">{{ showAll ? 'All Songs' : 'My Songs' }}</h3>
      <div v-for="s in (showAll ? songs : songs.filter(m => m.added_by === user.id))" :key="s.id"
        class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex items-center gap-3">
        <img v-if="s.album_art" :src="s.album_art" class="w-10 h-10 rounded object-cover" />
        <div class="flex-1">
          <div class="text-sm font-medium">{{ s.title }}</div>
          <div v-if="s.artist" class="text-xs text-gray-400">{{ s.artist }}</div>
        </div>
        <button v-if="!s.downloaded" @click="API.post(`/music/${s.id}/download`, {})" class="px-2 py-1 bg-blue-600 rounded text-xs">
          <FontAwesomeIcon :icon="['fas', 'download']" />
        </button>
      </div>
    </div>
  </div>
</template>
