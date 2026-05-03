<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps(['user'])
const router = useRouter()

const playlists = ref([])
const songs = ref([])

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

const selectPlaylist = (playlist) => {
  router.push(`/music/playlist/${playlist.id}`)
}

const selectMySongs = () => {
  router.push('/music/playlist/my-songs')
}

const selectAllSongs = () => {
  router.push('/music/playlist/all-songs')
}

watch(() => props.user, (user) => {
  if (user) load()
}, { immediate: true })
onMounted(load)
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
      <button @click="router.push('/music/add')" class="w-full p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 text-sm">
        <FontAwesomeIcon :icon="['fas', 'plus']" /> New Playlist
      </button>
    </div>
  </div>
</template>
