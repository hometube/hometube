<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getProvider } from '../api.js'

const router = useRouter()
const metadata = ref(null)
const loading = ref(true)
const error = ref(null)

async function fetchMetadata() {
  loading.value = true
  error.value = null
  try {
    metadata.value = await getProvider().getMetadata()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchMetadata)
</script>

<template>
  <div class="p-4 pt-16">
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.back()" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <h2 class="text-xl font-bold">Database Debug View</h2>
    </div>

    <div v-if="loading" class="text-gray-400 text-center py-8">Loading database metadata...</div>

    <div v-else-if="error" class="text-red-400 text-center py-8">
      Error loading metadata: {{ error }}
    </div>

    <div v-else class="bg-gray-900 rounded-lg overflow-hidden">
      <div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <span class="text-xs text-gray-400">
          {{ metadata.exported_at }} &middot;
          {{ metadata.users?.length || 0 }} users,
          {{ metadata.channels?.length || 0 }} channels,
          {{ metadata.subscriptions?.length || 0 }} subs,
          {{ metadata.videos?.length || 0 }} videos,
          {{ metadata.music?.length || 0 }} music,
          {{ metadata.playlists?.length || 0 }} playlists,
          {{ metadata.settings?.length || 0 }} settings
        </span>
        <button @click="fetchMetadata"
          class="text-xs text-blue-400 hover:text-blue-300">
          <FontAwesomeIcon :icon="['fas', 'rotate']" class="mr-1" />Refresh
        </button>
      </div>
      <pre class="p-4 text-xs text-green-400 overflow-auto max-h-[70vh] font-mono">{{ JSON.stringify(metadata, null, 2) }}</pre>
    </div>
  </div>
</template>
