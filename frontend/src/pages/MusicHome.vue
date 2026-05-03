<script>
import { ref, computed, watch, onMounted } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export default {
  components: { FontAwesomeIcon },
  props: ['user'],
  setup(props, { emit }) {
    const playlists = ref([])
    const songs = ref([])
    const selectedView = ref(null)

    const load = async () => {
      if (!props.user) return
      const [pls, allSongs] = await Promise.all([
        API.get('/playlists', { user_id: props.user.id }),
        API.get('/music', { user_id: props.user.id })
      ])
      playlists.value = pls
      songs.value = allSongs
    }

    const mySongs = computed(() => songs.value.filter(m => m.added_by === props.user?.id))
    const allSongsView = computed(() => songs.value)

    const selectPlaylist = (playlist) => {
      emit('open-playlist', playlist)
    }

    const selectMySongs = () => {
      emit('open-playlist', { type: 'virtual', name: 'My Songs', songs: mySongs.value })
    }

    const selectAllSongs = () => {
      emit('open-playlist', { type: 'virtual', name: 'All Songs', songs: allSongsView.value })
    }

    const restoreView = () => {
      const savedView = JSON.parse(localStorage.getItem('hometube_virtual_view') || 'null')
      if (savedView && savedView.type === 'virtual') {
        if (savedView.name === 'My Songs') {
          selectMySongs()
        } else {
          selectAllSongs()
        }
      }
    }

    watch(() => props.user, (user) => {
      if (user) load().then(restoreView)
    }, { immediate: true })
    onMounted(load)

    return { playlists, songs, mySongs, selectPlaylist, selectMySongs, selectAllSongs }
  }
}
</script>

<template>
  <div class="p-4 pt-16" v-if="user">
    <div class="mb-4">
      <h3 class="text-sm text-gray-400 uppercase mb-2">Playlists</h3>
      <div @click="selectMySongs"
        class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-700">
        <div class="font-medium">My Songs</div>
        <div class="text-xs text-gray-400">{{ mySongs.length }} songs</div>
      </div>
      <div @click="selectAllSongs"
        class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-700">
        <div class="font-medium">All Songs</div>
        <div class="text-xs text-gray-400">{{ songs.length }} songs</div>
      </div>
      <div v-for="pl in playlists" :key="pl.id" @click="selectPlaylist(pl)"
        class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-700">
        <div class="font-medium">{{ pl.name }}</div>
        <div class="text-xs text-gray-400">{{ (pl.songs || []).length }} songs</div>
      </div>
      <button @click="$emit('navigate', 'add')" class="w-full p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 text-sm">
        <FontAwesomeIcon :icon="['fas', 'plus']" /> New Playlist
      </button>
    </div>
  </div>
</template>
