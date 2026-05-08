<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const url = ref('')
const quality = ref('best')
const qualities = [
  { id: 'best', label: 'Best' },
  { id: 'best[height<=1080]', label: '1080p' },
  { id: 'best[height<=720]', label: '720p' },
  { id: 'best[height<=480]', label: '480p' }
]
const loading = ref(false)
const availableFormats = ref([])

const fetchFormats = async () => {
  if (!url.value) return
  availableFormats.value = await API.get('/videos/info', { url: url.value })
}

const add = async () => {
  if (!url.value || !userStore.user) return
  loading.value = true
  await API.post('/videos/add', { url: url.value, user_id: userStore.user.id, quality: quality.value })
  const videos = await API.get('/videos', { user_id: userStore.user.id })
  const newVid = videos[0]
  if (newVid && !newVid.downloaded) {
    await API.post(`/videos/${newVid.id}/download`, { quality: quality.value })
    if (confirm('Download complete! Save to device?')) {
      API.downloadFile(`/api/files/videos/${newVid.video_id}.mp4`, `${newVid.title}.mp4`)
    }
  }
  url.value = ''
  loading.value = false
}
</script>

<template>
  <div class="p-4 pt-16" v-if="userStore.user">
    <button @click="router.push('/video')" class="text-gray-400 mb-4">
       <FontAwesomeIcon :icon="['fas', 'arrow-left']" /> Back
     </button>
    <h2 class="text-xl font-bold mb-4">Add Video</h2>
    <input v-model="url" @blur="fetchFormats" placeholder="Paste YouTube video URL" class="w-full p-3 mb-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
    <div class="mb-3">
      <label class="text-sm text-gray-400 mb-1 block">Quality</label>
      <select v-model="quality" class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
        <option v-for="q in qualities" :key="q.id" :value="q.id">{{ q.label }}</option>
      </select>
    </div>
    <button @click="add" :disabled="loading || !url" class="w-full p-3 bg-blue-600 rounded-lg text-white disabled:bg-gray-700">
      <FontAwesomeIcon :icon="['fas', 'download']" /> {{ loading ? 'Adding...' : 'Add & Download' }}
    </button>
  </div>
</template>
