<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps(['user'])
const router = useRouter()

const url = ref('')
const newPlaylistName = ref('')
const selectedPlaylistId = ref(null)
const playlists = ref([])
const info = ref(null)
const loading = ref(false)

const loadPlaylists = async () => {
  if (!props.user) return
  playlists.value = await API.get('/playlists', { user_id: props.user.id })
}

const fetchInfo = async () => {
  if (!url.value) return
  info.value = await API.get('/music/info', { url: url.value })
}

const add = async () => {
  if (!url.value || !props.user) return
  loading.value = true
  let playlistId = selectedPlaylistId.value
  if (newPlaylistName.value) {
    const pl = await API.post('/playlists', { name: newPlaylistName.value, user_id: props.user.id })
    playlistId = pl.id
  }
  const music = await API.post('/music/add', { url: url.value, user_id: props.user.id, playlist_id: playlistId })
  if (!music.downloaded) {
    const downloadResult = await API.post(`/music/${music.id}/download`, {})
    if (confirm('Download complete! Save to device?')) {
      const filename = downloadResult.filename || `${music.id}.mp3`
      API.downloadFile(`/api/music/${music.id}/file`, `${music.title}.${filename.split('.').pop()}`)
    }
  }
  url.value = ''
  loading.value = false
  router.push('/music')
}

onMounted(loadPlaylists)
</script>

<template>
  <div class="p-4 pt-16" v-if="user">
    <button @click="router.push('/music')" class="text-gray-400 mb-4">
       <FontAwesomeIcon :icon="['fas', 'arrow-left']" /> Back
     </button>
    <h2 class="text-xl font-bold mb-4">Add Music</h2>
    <input v-model="url" @blur="fetchInfo" placeholder="Paste song or playlist URL" class="w-full p-3 mb-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />

    <div class="mb-3">
      <label class="text-sm text-gray-400 mb-1 block">Playlist</label>
      <select v-model="selectedPlaylistId" class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-2">
        <option :value="null">No playlist</option>
        <option v-for="pl in playlists" :key="pl.id" :value="pl.id">{{ pl.name }}</option>
      </select>
      <input v-model="newPlaylistName" placeholder="Or create new playlist..." class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
    </div>

    <button @click="add" :disabled="loading || !url" class="w-full p-3 bg-blue-600 rounded-lg text-white disabled:bg-gray-700">
      <FontAwesomeIcon :icon="['fas', 'music']" /> {{ loading ? 'Adding...' : 'Add Music' }}
    </button>
  </div>
</template>
