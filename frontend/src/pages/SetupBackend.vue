<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">HomeTube Setup</h1>

    <div class="bg-gray-800 p-6 rounded-lg mb-8">
      <h2 class="text-2xl font-semibold mb-4 text-center">Choose Your Mode</h2>
      <p class="text-gray-300 mb-6 text-center text-sm">
        HomeTube can run with a backend server, or in offline mode using a local data file.
      </p>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <button @click="mode = 'server'"
          :class="['p-4 rounded-lg border-2 text-center transition-colors', mode === 'server' ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600 hover:border-gray-400']">
          <div class="text-lg font-bold mb-1">Backend Server</div>
          <div class="text-xs text-gray-400">Connect to a remote HomeTube server</div>
        </button>
        <button @click="mode = 'local'"
          :class="['p-4 rounded-lg border-2 text-center transition-colors', mode === 'local' ? 'border-green-500 bg-green-900/30' : 'border-gray-600 hover:border-gray-400']">
          <div class="text-lg font-bold mb-1">Local Mode</div>
          <div class="text-xs text-gray-400">Use an .ht file for offline use</div>
        </button>
      </div>

      <div v-if="backendUrlError" class="bg-red-900 text-red-200 p-4 mb-4 rounded-lg">
        {{ backendUrlError }}
      </div>

      <div v-if="backendSuccess" class="bg-green-900 text-green-200 p-4 mb-4 rounded-lg">
        Backend configured successfully! Continue to user setup.
      </div>

      <div v-if="tokenExchange" class="bg-blue-900 text-blue-200 p-4 mb-4 rounded-lg">
        Exchanging temporary token for long-lived JWT...
      </div>

      <div v-if="mode === 'server'">
        <div class="mb-6">
          <label class="block text-sm font-medium text-white mb-2">Backend URL</label>
          <div class="flex items-center space-x-2">
            <input v-model="backendUrl"
                   placeholder="e.g., http://localhost:8000/api or https://abc123.ngrok.io/api?token=your-secret-code"
                   class="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
          </div>
          <p class="text-xs text-gray-400 mt-1">
            For ngrok or public URLs, add ?token=your-secret-code for basic protection.
          </p>
        </div>

        <div class="text-center">
          <button @click="testConnection"
                  :disabled="!backendUrl.trim()"
                  class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
            Test Connection & Continue
          </button>
        </div>
      </div>

      <div v-if="mode === 'local'">
        <div class="mb-4">
          <label class="text-sm text-gray-400 mb-2 block">Import .ht file (required)</label>
          <label class="block border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
            <input type="file" accept=".ht" @change="onFileChange" class="hidden" />
            <div class="text-sm text-gray-400">
              {{ importFile ? importFile.name : 'Tap to select an .ht file' }}
            </div>
          </label>
        </div>
        <div v-if="importResult" class="text-sm mb-4"
          :class="importResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'">
          {{ importResult }}
        </div>
        <button @click="doImport" :disabled="!importFile"
                class="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors">
          Import & Start
        </button>
      </div>
    </div>

    <div class="text-center mt-8">
      <a href="/" class="text-blue-400 hover:text-blue-300">
        &larr; Back to About
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { API, setLocalMode } from '../api.js'
import { useRoute, useRouter } from 'vue-router'

const mode = ref('server')
const backendUrl = ref(localStorage.getItem('backendUrl') || '')
const backendUrlError = ref('')
const backendSuccess = ref(false)
const tokenExchange = ref(false)
const importFile = ref(null)
const importResult = ref('')
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  if (route.query.backend) {
    mode.value = 'server'
    backendUrl.value = route.query.backend
    await testConnection()
  }
})

const onFileChange = (e) => {
  importFile.value = e.target.files[0] || null
  importResult.value = ''
}

const saveBackendUrl = () => {
  if (!backendUrl.value.trim()) {
    localStorage.removeItem('backendUrl')
    localStorage.removeItem('jwt_token')
  } else {
    localStorage.setItem('backendUrl', backendUrl.value.trim())
  }
  backendUrlError.value = ''
}

const testConnection = async () => {
  if (!backendUrl.value || !backendUrl.value.trim()) {
    backendUrlError.value = 'Please enter a backend URL'
    return
  }

  saveBackendUrl()
  await new Promise(resolve => setTimeout(resolve, 100))

  try {
    await API.get('/status')

    const url = backendUrl.value.trim()
    const params = new URLSearchParams(url.split('?')[1] || '')
    const tempToken = params.get('token')

    if (tempToken) {
      tokenExchange.value = true
      try {
        await API.exchangeToken(tempToken)
        const cleanUrl = url.split('?')[0]
        localStorage.setItem('backendUrl', cleanUrl)
      } catch (e) {
        console.error('Token exchange failed:', e)
      }
      tokenExchange.value = false
    }

    backendSuccess.value = true
    setTimeout(() => router.push('/setup/user'), 1500)
  } catch (error) {
    console.error('Failed to connect to backend:', error)
    backendUrlError.value = 'Failed to connect to backend. Please check the URL and try again.'
    backendSuccess.value = false
  }
}

const doImport = async () => {
  if (!importFile.value) return
  importResult.value = ''
  try {
    setLocalMode(true)
    const data = await API.importData(importFile.value)
    if (data.summary) {
      const parts = []
      for (const [k, v] of Object.entries(data.summary)) {
        if (v > 0) parts.push(`${v} ${k}`)
      }
      importResult.value = `Imported: ${parts.join(', ')}`
    }
    setTimeout(() => router.push('/setup/user'), 1500)
  } catch (e) {
    importResult.value = `Error: ${e.message}`
  }
}
</script>
