<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">HomeTube Setup</h1>
    
    <div class="bg-gray-800 p-6 rounded-lg mb-8">
      <h2 class="text-2xl font-semibold mb-4 text-center">Step 1: Configure Backend</h2>
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
    
    <div class="text-center mt-8">
      <a href="/" class="text-blue-400 hover:text-blue-300">
        ← Back to About
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { API } from '../api.js'
import { useRouter } from 'vue-router'

const backendUrl = ref('')
const backendUrlError = ref('')
const backendSuccess = ref(false)
const router = useRouter()

const saveBackendUrl = () => {
  if (!backendUrl.value.trim()) {
    localStorage.removeItem('backendUrl')
  } else {
    localStorage.setItem('backendUrl', backendUrl.value.trim())
  }
  backendUrlError.value = ''
}

const testConnection = async () => {
  if (!backendUrl.value.trim()) {
    backendUrlError.value = 'Please enter a backend URL'
    return
  }
  
  saveBackendUrl()
  
  try {
    // Test the connection by trying to get users (should return empty array or users)
    await API.get('/users')
    backendSuccess.value = true
    
    // Wait a moment then redirect to user setup
    setTimeout(() => {
      router.push('/setup/user')
    }, 1500)
  } catch (error) {
    console.error('Failed to connect to backend:', error)
    backendUrlError.value = 'Failed to connect to backend. Please check the URL and try again.'
    backendSuccess.value = false
  }
}
</script>

<style scoped>
/* Any specific styling for the setup backend page can go here */
</style>