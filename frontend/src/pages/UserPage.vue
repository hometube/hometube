<script setup>
import { ref, onMounted } from 'vue'
import { API } from '../api.js'

const emit = defineEmits(['select'])
const username = ref('')
const users = ref([])
const backendUrl = ref(localStorage.getItem('backendUrl') || '')
const showBackendSettings = ref(false)

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
