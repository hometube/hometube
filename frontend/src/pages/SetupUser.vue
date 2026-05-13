<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">HomeTube Setup</h1>
    
    <div class="bg-gray-800 p-6 rounded-lg mb-8">
      <h2 class="text-2xl font-semibold mb-4 text-center">Step 2: Create User</h2>
      <p class="text-gray-300 mb-4 text-center">
        {{ localMode ? 'Create a user to personalize your HomeTube experience.' : 'Now that your backend is configured, create a user to personalize your HomeTube experience.' }}
      </p>
      
      <div v-if="backendUrlError" class="bg-red-900 text-red-200 p-4 mb-4 rounded-lg">
        {{ backendUrlError }}
      </div>
      
      <div v-if="userCreated" class="bg-green-900 text-green-200 p-4 mb-4 rounded-lg">
        User created successfully! You can now access HomeTube.
      </div>
      
      <div v-if="!localMode && users.length > 0 && !userCreated" class="mb-6">
        <h3 class="text-lg mb-2">Existing Users</h3>
        <div v-for="u in users" :key="u.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex justify-between items-center">
          <span>{{ u.username }}</span>
          <button @click="selectExisting(u)" 
                  class="px-3 py-1 bg-gray-600 rounded text-sm">
            Select
          </button>
        </div>
      </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium text-white mb-2">Username</label>
        <input v-model="username" 
               placeholder="Enter your username" 
               class="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
      </div>
      
       <div class="flex justify-between items-center">
         <button @click="saveUser" 
                 :disabled="!username || !username.trim()"
                 class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
           Create User
         </button>
        
        <button v-if="!localMode" @click="loadUsers" 
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
          Refresh Users
        </button>
      </div>
    </div>
    
    <div class="text-center mt-8">
      <a href="/setup" class="text-blue-400 hover:text-blue-300">
        ← Back to Backend Setup
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { API, isLocalMode } from '../api.js'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const username = ref('')
const users = ref([])
const backendUrlError = ref('')
const userCreated = ref(false)
const router = useRouter()
const userStore = useUserStore()
const localMode = computed(() => isLocalMode())

const loadUsers = async () => {
  try {
    users.value = await API.get('/users')
    backendUrlError.value = ''
  } catch (error) {
    console.error('Failed to load users:', error)
    users.value = []
    backendUrlError.value = 'Failed to connect to backend. Please check the URL.'
  }
}

const saveUser = async () => {
  if (!username.value || !username.value.trim()) return
  
  try {
    const user = await API.post('/users', { username: username.value.trim() })
    userStore.setUser(user)
    userCreated.value = true
    
    // Wait a moment then redirect to home
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (error) {
    console.error('Failed to create user:', error)
    backendUrlError.value = 'Failed to create user. Please check backend connection.'
  }
}

const selectExisting = (user) => {
  userStore.setUser(user)
  router.push('/')
}

onMounted(() => {
  if (!localMode.value) loadUsers()
})
</script>

<style scoped>
/* Any specific styling for the setup user page can go here */
</style>