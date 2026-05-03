<script>
import { ref, onMounted, watch } from 'vue'
import { API } from '../api.js'

export default {
  props: ['user'],
  setup(props) {
    const music = ref([])
    const url = ref('')

    const load = async () => {
      if (!props.user) return
      music.value = await API.get('/music', { user_id: props.user.id })
    }

    const add = async () => {
      if (!url.value) return
      await API.post('/music/add', { url: url.value, user_id: props.user.id })
      url.value = ''
      load()
    }

    const download = async (id) => {
      await API.post(`/music/${id}/download`, { user_id: props.user.id })
      load()
    }

    const cleanTitle = (title) => {
      if (!title) return title
      return title.replace(/\s*\[[^\]]+\]\s*$/, '')
    }

    watch(() => props.user, load, { immediate: true })
    onMounted(load)

    return { music, url, add, download, cleanTitle }
  }
}
</script>

<template>
  <div class="p-4" v-if="user">
    <h2 class="text-xl font-bold mb-4">Music Mode</h2>
    <input v-model="url" placeholder="Paste song or playlist URL" class="w-full p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
    <button @click="add" class="w-full p-3 bg-gray-700 rounded-lg text-white mb-4">Add Music</button>

    <h3 class="text-lg mb-2">Your Music</h3>
    <div v-for="m in music" :key="m.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2">
      <div class="text-sm mb-1">{{ cleanTitle(m.title) }}</div>
      <div class="flex gap-1 mb-1">
        <span v-if="m.artist" class="text-xs bg-gray-600 px-2 py-1 rounded">{{ m.artist }}</span>
        <span v-if="m.is_playlist" class="text-xs bg-gray-600 px-2 py-1 rounded">Playlist</span>
      </div>
      <div v-if="m.downloaded" class="text-xs text-green-400">Downloaded</div>
      <button v-else @click="download(m.id)" class="px-3 py-1 bg-blue-600 rounded text-sm">Download</button>
    </div>
  </div>
</template>
