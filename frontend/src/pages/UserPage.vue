<script setup>
import { ref, onMounted, computed } from 'vue'
import { API } from '../api.js'
import { useRoute } from 'vue-router'

const emit = defineEmits(['select'])
const route = useRoute()
const username = ref('')
const users = ref([])
const backendUrl = ref(localStorage.getItem('backendUrl') || '')
const showBackendSettings = ref(false)

const isGitHubPages = computed(() => {
  return location.hostname.endsWith('github.io')
})

const showDocumentationBanner = computed(() => {
  return !username.value && isGitHubPages.value && route.path === '/'
})

const loadUsers = async () => {
  try {
    users.value = await API.get('/users')
  } catch (error) {
    // Handle connection errors gracefully
    console.error('Failed to load users:', error)
  }
}

const saveUser = async () => {
  if (!username.value.trim()) return
  const user = await API.post('/users', { username: username.value.trim() })
  emit('select', user)
}

const selectExisting = (user) => {
  emit('select', user)
}

const saveBackendUrl = () => {
  if (backendUrl.value.trim()) {
    localStorage.setItem('backendUrl', backendUrl.value.trim())
    showBackendSettings.value = false
  } else {
    localStorage.removeItem('backendUrl')
    showBackendSettings.value = false
  }
}

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
            <li>Visit <a href="/about" class="underline hover:text-white">About page</a> to learn about the project</li>
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
    
    <h2 class="text-xl font-bold mb-4">Select User</h2>
    <input v-model="username" placeholder="Enter username" class="w-full p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
    <button @click="saveUser" class="w-full p-3 bg-gray-700 rounded-lg text-white mb-4">Select User</button>
    
    <div class="mb-6 p-3 bg-gray-800 border border-gray-700 rounded-lg">
      <button @click="showBackendSettings = !showBackendSettings" class="w-full text-left p-2 rounded hover:bg-gray-800 text-white">
        <span>{{ showBackendSettings ? 'Hide' : 'Configure' }} Backend URL</span>
        <FontAwesomeIcon :icon="['fas', showBackendSettings ? 'times' : 'cog']" class="ml-2" />
      </button>
      
      <div v-if="showBackendSettings" class="mt-3">
        <div class="mb-2">
          <label class="block text-sm font-medium text-white mb-1">Backend URL</label>
          <input v-model="backendUrl" placeholder="e.g., http://localhost:8000 or https://your-domain.com" 
                 class="w-full p-2 mb-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
          <button @click="saveBackendUrl" class="w-full p-2 bg-gray-700 rounded text-white">Save Backend URL</button>
        </div>
        <p class="text-xs text-gray-400">
          Leave empty to use default (/api). Useful when hosting frontend separately.
        </p>
      </div>
    </div>
    
    <h3 class="text-lg mb-2">Existing Users</h3>
    <div v-for="u in users" :key="u.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex justify-between items-center">
      <span>{{ u.username }}</span>
      <button @click="selectExisting(u)" class="px-3 py-1 bg-gray-600 rounded text-sm">Select</button>
    </div>
  </div>
</template>
