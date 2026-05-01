<script>
import { ref, computed } from 'vue'
import { API } from './api.js'
import UserPage from './pages/UserPage.vue'
import VideoPage from './pages/VideoPage.vue'
import MusicPage from './pages/MusicPage.vue'

export default {
  components: { UserPage, VideoPage, MusicPage },
  setup() {
    const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'))
    const activeTab = ref(currentUser.value ? 'video' : 'user')

    const setUser = (user) => {
      currentUser.value = user
      localStorage.setItem('user', JSON.stringify(user))
      activeTab.value = 'video'
    }

    return { currentUser, activeTab, setUser }
  }
}
</script>

<template>
  <div class="min-h-screen bg-black text-white pb-16">
    <UserPage v-if="activeTab === 'user'" @select="setUser" />
    <VideoPage v-if="activeTab === 'video'" :user="currentUser" />
    <MusicPage v-if="activeTab === 'music'" :user="currentUser" />
  </div>
  <nav class="fixed bottom-0 left-0 right-0 flex bg-gray-900 border-t border-gray-700">
    <button @click="activeTab = 'user'" :class="['flex-1 py-3 text-sm', activeTab === 'user' ? 'text-white' : 'text-gray-500']">User</button>
    <button @click="activeTab = 'video'" :class="['flex-1 py-3 text-sm', activeTab === 'video' ? 'text-white' : 'text-gray-500']">Video</button>
    <button @click="activeTab = 'music'" :class="['flex-1 py-3 text-sm', activeTab === 'music' ? 'text-white' : 'text-gray-500']">Music</button>
  </nav>
</template>
