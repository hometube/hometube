<script setup>
import { ref, onMounted, watch } from 'vue'
import { API } from '../api.js'

const props = defineProps(['user'])

const videos = ref([])
const channels = ref([])
const url = ref('')
const action = ref('link')

const load = async () => {
  if (!props.user) return
  const [v, c] = await Promise.all([
    API.get('/videos', { user_id: props.user.id }),
    API.get('/channels')
  ])
  videos.value = v
  channels.value = c
}

const add = async () => {
  if (!url.value) return
  if (action.value === 'link') await API.post('/videos/add', { url: url.value, user_id: props.user.id })
  else await API.post('/channels/add', { url: url.value })
  url.value = ''
  load()
}

const subscribe = async (chanId) => {
  const criteria = prompt('Keywords (comma-separated):')
  await API.post(`/channels/${chanId}/subscribe`, { user_id: props.user.id, criteria: criteria ? { keywords: criteria.split(',') } : {} })
  load()
}

const download = async (vidId) => {
  await API.post(`/videos/${vidId}/download`, { user_id: props.user.id })
  load()
}

watch(() => props.user, load, { immediate: true })
onMounted(load)
</script>

<template>
  <div class="p-4" v-if="user">
    <h2 class="text-xl font-bold mb-4">Video Mode</h2>
    <select v-model="action" class="w-full p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
      <option value="link">Add Video by Link</option>
      <option value="channel">Add Channel</option>
    </select>
    <input v-model="url" placeholder="Paste video or channel URL" class="w-full p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
    <button @click="add" class="w-full p-3 bg-gray-700 rounded-lg text-white mb-4">Add</button>

    <h3 class="text-lg mb-2">Channels</h3>
    <div v-for="c in channels" :key="c.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex justify-between items-center">
      <span class="text-sm">{{ c.name }}</span>
      <button @click="subscribe(c.id)" class="px-3 py-1 bg-gray-600 rounded text-sm">Subscribe</button>
    </div>

    <h3 class="text-lg mb-2">Videos</h3>
    <div v-for="v in videos" :key="v.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2">
      <div class="text-sm mb-1">{{ v.title }}</div>
      <div v-if="v.downloaded" class="text-xs text-green-400">Downloaded</div>
      <button v-else @click="download(v.id)" class="px-3 py-1 bg-blue-600 rounded text-sm">Download</button>
    </div>
  </div>
</template>
