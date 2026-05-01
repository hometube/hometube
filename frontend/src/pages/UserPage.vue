<script>
import { ref, onMounted } from 'vue'
import { API } from '../api.js'

export default {
  emits: ['select'],
  setup(props, { emit }) {
    const username = ref('')
    const users = ref([])

    const loadUsers = async () => {
      users.value = await API.get('/users')
    }

    const saveUser = async () => {
      if (!username.value.trim()) return
      const user = await API.post('/users', { username: username.value.trim() })
      emit('select', user)
    }

    const selectExisting = (user) => {
      emit('select', user)
    }

    onMounted(loadUsers)

    return { username, users, saveUser, selectExisting }
  }
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-4">Select User</h2>
    <input v-model="username" placeholder="Enter username" class="w-full p-3 mb-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
    <button @click="saveUser" class="w-full p-3 bg-gray-700 rounded-lg text-white mb-4">Select User</button>
    <h3 class="text-lg mb-2">Existing Users</h3>
    <div v-for="u in users" :key="u.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex justify-between items-center">
      <span>{{ u.username }}</span>
      <button @click="selectExisting(u)" class="px-3 py-1 bg-gray-600 rounded text-sm">Select</button>
    </div>
  </div>
</template>
