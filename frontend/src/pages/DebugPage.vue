<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getProvider } from '../api.js'
import { useErrorStore } from '../stores/errors.js'

const router = useRouter()
const errorStore = useErrorStore()

const tab = ref('metadata')
const metadata = ref(null)
const loading = ref(true)
const error = ref(null)

const errorTypeClass = {
  vue: 'text-yellow-400',
  js: 'text-red-400',
  promise: 'text-orange-400',
  unknown: 'text-gray-400'
}

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

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString()
}

onMounted(fetchMetadata)
</script>

<template>
  <div class="p-4 pt-16">
    <div class="flex items-center gap-3 mb-4">
      <button @click="router.back()" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <h2 class="text-xl font-bold">Debug View</h2>
    </div>

    <div class="flex gap-2 mb-4">
      <button @click="tab = 'metadata'"
        :class="tab === 'metadata' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
        class="px-3 py-1.5 rounded text-sm">Database</button>
      <button @click="tab = 'errors'; errorStore.markAllRead()"
        :class="tab === 'errors' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
        class="px-3 py-1.5 rounded text-sm relative">
        Error Log
        <span v-if="errorStore.unreadCount" class="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{{ errorStore.unreadCount }}</span>
      </button>
      <button @click="errorStore.clearEvents()" v-if="errorStore.count"
        class="px-3 py-1.5 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 ml-auto">
        <FontAwesomeIcon :icon="['fas', 'trash']" class="mr-1" />Clear
      </button>
    </div>

    <div v-if="tab === 'metadata'">
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

    <div v-else-if="tab === 'errors'">
      <div v-if="errorStore.count === 0" class="text-gray-400 text-center py-8">No errors recorded.</div>

      <div v-else class="space-y-2 max-h-[75vh] overflow-y-auto">
        <div v-for="ev in errorStore.events" :key="ev.id"
          class="bg-gray-900 rounded-lg p-3 text-xs font-mono">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-gray-500">{{ formatTime(ev.timestamp) }}</span>
            <span :class="errorTypeClass[ev.type] || 'text-gray-400'" class="font-bold uppercase">{{ ev.type }}</span>
            <span v-if="ev.component" class="text-gray-500">[{{ ev.component }}]</span>
          </div>
          <div class="text-gray-200 break-words">{{ ev.message }}</div>
          <div v-if="ev.stack" class="text-gray-500 mt-1 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{{ ev.stack }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
