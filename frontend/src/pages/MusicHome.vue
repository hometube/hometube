<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const playlists = ref([])
const songs = ref([])

const load = async () => {
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

const mySongs = computed(() => songs.value.filter(m => m.added_by === userStore.user?.id))

const virtualPlaylists = computed(() => [
  { id: 'my-songs', name: 'My Songs', songs: mySongs.value },
  { id: 'all-songs', name: 'All Songs', songs: songs.value }
])

watch(() => userStore.user, (user) => {
  if (user) load()
}, { immediate: true })

onMounted(load)

const openPlaylist = (pl) => {
  router.push(`/music/playlist/${pl.id}`)
}

const openVirtual = (vp) => {
  router.push(`/music/playlist/${vp.id}`)
}
</script>

<template>
  <div class="p-4 pt-16">
    <div class="mb-4">
      <h2 class="text-xl font-bold mb-2">Playlists</h2>
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div v-for="vp in virtualPlaylists" :key="vp.id" @click="openVirtual(vp)"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700">
          <div class="font-medium">{{ vp.name }}</div>
          <div class="text-xs text-gray-400">{{ vp.songs.length }} songs</div>
        </div>
      </div>
      <div v-if="playlists.length === 0" class="text-center py-8 text-gray-500">
        No playlists yet. Add music to create one.
      </div>
      <div v-else class="space-y-2">
        <div v-for="pl in playlists" :key="pl.id" @click="openPlaylist(pl)"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700">
          <div class="font-medium">{{ pl.name }}</div>
        </div>
      </div>
    </div>
    <button @click="router.push('/music/add')" class="w-full p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 text-sm">
      + Add Music
    </button>
  </div>
</template>
