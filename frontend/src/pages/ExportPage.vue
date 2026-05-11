<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { API } from '../api.js'

const router = useRouter()

const exportType = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const loading = ref(false)
const result = ref('')

const doExport = async () => {
  loading.value = true
  result.value = ''
  try {
    const body = { type: exportType.value }
    if (dateFrom.value) body.date_from = dateFrom.value
    if (dateTo.value) body.date_to = dateTo.value
    const fname = await API.exportData(body)
    result.value = `Exported: ${fname}`
  } catch (e) {
    result.value = `Error: ${e.message}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4 pt-16">
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.back()" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <h2 class="text-xl font-bold">Export Data</h2>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">What to export</div>
      <div class="bg-gray-800 rounded-lg divide-y divide-gray-700">
        <label class="flex items-center p-4 cursor-pointer">
          <input type="radio" v-model="exportType" value="all" class="mr-3" />
          <div>
            <div class="text-sm font-medium">Everything</div>
            <div class="text-xs text-gray-400">Videos, music, playlists, and settings</div>
          </div>
        </label>
        <label class="flex items-center p-4 cursor-pointer">
          <input type="radio" v-model="exportType" value="videos" class="mr-3" />
          <div>
            <div class="text-sm font-medium">Videos Only</div>
            <div class="text-xs text-gray-400">Video metadata and downloaded files</div>
          </div>
        </label>
        <label class="flex items-center p-4 cursor-pointer">
          <input type="radio" v-model="exportType" value="music" class="mr-3" />
          <div>
            <div class="text-sm font-medium">Music Only</div>
            <div class="text-xs text-gray-400">Music metadata, files, and playlists</div>
          </div>
        </label>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Date Range (optional)</div>
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="text-xs text-gray-400 block mb-1">From</label>
          <input type="date" v-model="dateFrom"
            class="w-full bg-gray-800 rounded p-2 text-sm border border-gray-700" />
        </div>
        <div class="flex-1">
          <label class="text-xs text-gray-400 block mb-1">To</label>
          <input type="date" v-model="dateTo"
            class="w-full bg-gray-800 rounded p-2 text-sm border border-gray-700" />
        </div>
      </div>
    </div>

    <button @click="doExport" :disabled="loading"
      class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg p-3 font-medium">
      <FontAwesomeIcon v-if="loading" :icon="['fas', 'spinner']" spin class="mr-2" />
      <FontAwesomeIcon v-else :icon="['fas', 'download']" class="mr-2" />
      {{ loading ? 'Exporting...' : 'Export' }}
    </button>

    <div v-if="result" class="mt-4 text-sm"
      :class="result.startsWith('Error') ? 'text-red-400' : 'text-green-400'">
      {{ result }}
    </div>
  </div>
</template>
