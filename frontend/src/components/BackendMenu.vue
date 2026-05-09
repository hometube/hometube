<template>
  <div v-if="open" class="fixed inset-0 z-[1000] bg-black bg-opacity-50 flex items-center justify-center" @click.self="open = false">
    <div class="bg-gray-800 p-6 rounded-lg shadow-lg m-2">
      <h2 class="text-2xl font-semibold mb-4 text-center">Configure Backend</h2>
      <p class="text-gray-300 mb-4 text-center">
        Enter your HomeTube backend URL to continue. This should be the URL where your 
        HomeTube backend is running (e.g., http://localhost:8000/api or ngrok URL).
      </p>
      
      <div v-if="backendUrlError" class="bg-red-900 text-red-200 p-4 mb-4 rounded-lg">
        {{ backendUrlError }}
      </div>
      
        <div v-if="backendSuccess" class="bg-green-900 text-green-200 p-4 mb-4 rounded-lg">
          Backend configured successfully! Click below to continue to user setup.
        </div>

        <div v-if="tokenExchange" class="bg-blue-900 text-blue-200 p-4 mb-4 rounded-lg">
          Exchanging temporary token for long-lived JWT...
        </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium text-white mb-2">Backend URL</label>
        <div class="flex items-center space-x-2">
          <input v-model="backendUrl" 
                placeholder="e.g., http://localhost:8000/api or https://abc123.ngrok.io/api?token=your-secret-code" 
                class="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
        </div>
        <p class="text-xs text-gray-400 mt-1">
          For ngrok or public URLs, add ?token=your-secret-code for basic protection.
          Leave empty to use default (/api). Useful when hosting frontend separately.
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { API } from '../api.js'
import { useRoute, useRouter } from 'vue-router'

const backendUrl = ref(localStorage.getItem('backendUrl') || '')
const backendUrlError = ref('')
const backendSuccess = ref(false)
const tokenExchange = ref(false)
const router = useRouter()
const route = useRoute()
const open = ref(false)

defineExpose({
  open: () => { open.value = true },
  close: () => { open.value = false },
})

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
    // Test the connection using status endpoint (only needs ngrok token)
    await API.get('/status')

    // Try to exchange temporary token for JWT if we have one
    const url = backendUrl.value.trim()
    const params = new URLSearchParams(url.split('?')[1] || '')
    const tempToken = params.get('token')

    if (tempToken) {
      tokenExchange.value = true
      try {
        await API.exchangeToken(tempToken)
        // Remove token from stored URL since we now use JWT
        const cleanUrl = url.split('?')[0]
        localStorage.setItem('backendUrl', cleanUrl)
      } catch (e) {
        console.error('Token exchange failed:', e)
        // Continue anyway - will use temp token
      }
      tokenExchange.value = false
    }

    backendSuccess.value = true

    // Wait a moment then redirect to user setup
    setTimeout(() => window.location.reload(), 1500)
  } catch (error) {
    console.error('Failed to connect to backend:', error)
    backendUrlError.value = 'Failed to connect to backend. Please check the URL and try again.'
    backendSuccess.value = false
  }
}
</script>
