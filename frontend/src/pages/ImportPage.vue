<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { API, isLocalMode, setLocalMode } from '../api.js'
import { LocalDB } from '../localDb.js'

const router = useRouter()

const file = ref(null)
const loading = ref(false)
const result = ref('')
const summary = ref(null)

const onFileChange = (e) => {
  file.value = e.target.files[0] || null
  result.value = ''
  summary.value = null
}

const doImport = async () => {
  if (!file.value) return
  loading.value = true
  result.value = ''
  summary.value = null
  try {
    const data = await API.importData(file.value, true)
    summary.value = data.summary
    const users = await LocalDB.getAll('users')
    if (users.length > 0) {
      localStorage.setItem('user', JSON.stringify(users[0]))
    }
    result.value = 'Import completed successfully. You can now use HomeTube in local (offline) mode without the backend server. Navigate to browse your imported content.'
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
      <h2 class="text-xl font-bold">Import Data</h2>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Upload .ht file</div>
      <label class="block border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
        <input type="file" accept=".ht" @change="onFileChange" class="hidden" />
        <FontAwesomeIcon :icon="['fas', 'file-archive']" class="text-3xl text-gray-400 mb-2" />
        <div class="text-sm text-gray-400">
          {{ file ? file.name : 'Tap to select an .ht file' }}
        </div>
      </label>
    </div>

    <button @click="doImport" :disabled="!file || loading"
      class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg p-3 font-medium">
      <FontAwesomeIcon v-if="loading" :icon="['fas', 'spinner']" spin class="mr-2" />
      <FontAwesomeIcon v-else :icon="['fas', 'upload']" class="mr-2" />
      {{ loading ? 'Importing...' : 'Import' }}
    </button>

    <div v-if="result" class="mt-4 text-sm"
      :class="result.startsWith('Error') ? 'text-red-400' : 'text-green-400'">
      {{ result }}
    </div>

    <div v-if="summary" class="mt-4 bg-gray-800 rounded-lg p-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Import Summary</div>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Users</span>
          <span>{{ summary.users }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Channels</span>
          <span>{{ summary.channels }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Subscriptions</span>
          <span>{{ summary.subscriptions }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Videos</span>
          <span>{{ summary.videos }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Music</span>
          <span>{{ summary.music }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Playlists</span>
          <span>{{ summary.playlists }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
