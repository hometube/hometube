<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { API } from '../api.js'
import { useRoute } from 'vue-router'

const emit = defineEmits(['select'])
const route = useRoute()
const username = ref('')
const users = ref([])
const backendUrl = ref(localStorage.getItem('backendUrl') || '')
const backendUrlError = ref('')
const backendConfigured = computed(() => !!backendUrl.value.trim())

const isGitHubPages = computed(() => {
  return location.hostname.endsWith('github.io')
})

const showDocumentationBanner = computed(() => {
  return !username.value && isGitHubPages.value && route.path === '/'
})

const loadUsers = async () => {
  if (!backendConfigured.value) {
    users.value = []
    return
  }
  
  try {
    users.value = await API.get('/users')
    backendUrlError.value = ''
  } catch (error) {
    // Handle connection errors gracefully
    console.error('Failed to load users:', error)
    users.value = []
    backendUrlError.value = 'Failed to connect to backend. Please check the URL.'
  }
}

const saveUser = async () => {
  if (!backendConfigured.value) {
    backendUrlError.value = 'Please configure backend URL first'
    return
  }
  
  if (!username.value.trim()) return
  
  try {
    const user = await API.post('/users', { username: username.value.trim() })
    emit('select', user)
    backendUrlError.value = ''
  } catch (error) {
    console.error('Failed to create user:', error)
    backendUrlError.value = 'Failed to create user. Please check backend connection.'
  }
}

const selectExisting = (user) => {
  if (!backendConfigured.value) {
    backendUrlError.value = 'Please configure backend URL first'
    return
  }
  
  emit('select', user)
  backendUrlError.value = ''
}

const saveBackendUrl = () => {
  if (!backendUrl.value.trim()) {
    localStorage.removeItem('backendUrl')
  } else {
    localStorage.setItem('backendUrl', backendUrl.value.trim())
  }
  backendUrlError.value = ''
  loadUsers()
}

watch(backendUrl, () => {
  saveBackendUrl()
})

onMounted(loadUsers)
</script>

<template>
  <div class="p-4">
    <!-- Documentation Banner for GitHub Pages -->
    <div v-if="showDocumentationBanner" class="bg-blue-900 text-blue-200 p-4 mb-6 rounded-lg">
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <FontAwesomeIcon :icon="['fas', 'info-circle']" class="text-xl mt-0.5" />
        </div>
        <div>
          <h3 class="font-semibold text-white mb-2">Welcome to HomeTube!</h3>
          <p class="text-sm mb-2">
            You're using the hosted version at hometube.github.io. To get started:
          </p>
          <ul class="list-disc list-inside text-xs space-y-1">
            <li>Configure your backend URL below (e.g., http://localhost:8000)</li>
            <li>Create a user to personalize your experience</li>
            <li>Start adding videos and music to your library</li>
          </ul>
          <p class="mt-2 text-xs">
            <a href="https://github.com/hometube/hometube" class="underline hover:text-white" target="_blank">
              View source code on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
    
    <!-- Backend Configuration Alert -->
    <div v-if="!backendConfigured.value && isGitHubPages.value" class="bg-red-900 text-red-200 p-4 mb-6 rounded-lg">
      <div class="flex items-start space-x-4">
        <div class="flex-shrink-0">
          <FontAwesomeIcon :icon="['fas', 'exclamation-triangle']" class="text-xl mt-0.5" />
        </div>
        <div>
          <h3 class="font-semibold text-white mb-2">Backend Configuration Required</h3>
          <p class="text-sm">
            Please configure your backend URL below to use HomeTube. Once configured, you'll be able to create/select users and access your media library.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Backend Error Message -->
    <div v-if="backendUrlError" class="bg-red-900 text-red-200 p-4 mb-6 rounded-lg">
      {{ backendUrlError }}
    </div>
    
    <h2 class="text-xl font-bold mb-4">Select User</h2>
    <div class="flex justify-between items-center">
      <input v-model="username" 
             placeholder="Enter username" 
             :disabled="!backendConfigured.value"
             class="flex-1 p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg text-white cursor-not-allowed" />
      <button @click="saveUser" 
              :disabled="!backendConfigured.value || !username.value.trim()"
              class="p-3 bg-gray-700 rounded-lg text-white mb-4 cursor-not-allowed"
              :class="{ 'opacity-50': !backendConfigured.value || !username.value.trim() }">
        Create
      </button>
    </div>

    <h3 class="text-lg mb-2">Existing Users</h3>
    <div v-if="users.length === 0 && backendConfigured.value" class="text-center py-8">
      <p class="text-gray-500">No users found. Create a user above to get started.</p>
    </div>
    <div v-else-if="users.length > 0">
      <div v-for="u in users" :key="u.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex justify-between items-center">
        <span>{{ u.username }}</span>
        <button @click="selectExisting(u)" 
                :disabled="!backendConfigured.value"
                class="px-3 py-1 bg-gray-600 rounded text-sm cursor-not-allowed"
                :class="{ 'opacity-50': !backendConfigured.value }">
          Select
        </button>
      </div>
    </div>
    
    <!-- Always visible Backend URL input -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-white mb-2">Backend URL</label>
      <div class="flex items-center space-x-2">
        <input v-model="backendUrl" 
               placeholder="e.g., https://abc123.ngrok.io/api?token=your-secret-code" 
               class="flex-1 p-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
        <button @click="saveBackendUrl" class="p-2 bg-gray-700 rounded text-white">
          <FontAwesomeIcon :icon="['fas', 'save']" />
        </button>
      </div>
      <p class="text-xs text-gray-400 mt-1">
        For ngrok or public URLs, add ?token=your-secret-code for basic protection.
        Leave empty to use default (/api). Useful when hosting frontend separately.
      </p>
    </div>
  </div>
</template>
