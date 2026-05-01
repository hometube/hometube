<script>
import { ref, computed } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHome, faVideo, faMusic, faBars, faPlay, faPause, faForward, faBackward, faRandom, faRedo, faEllipsisV, faHeart, faTrash, faPlus, faSearch, faFilter, faEye, faEyeSlash, faDownload, faCog, faTimes, faCheck, faList, faTv, faHeadphones, faSave } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { API } from './api.js'
import UserPage from './pages/UserPage.vue'
import VideoHome from './pages/VideoHome.vue'
import AddVideo from './pages/AddVideo.vue'
import AddChannel from './pages/AddChannel.vue'
import MusicHome from './pages/MusicHome.vue'
import AddMusic from './pages/AddMusic.vue'
import PlaylistView from './pages/PlaylistView.vue'

library.add(faHome, faVideo, faMusic, faBars, faPlay, faPause, faForward, faBackward, faRandom, faRedo, faEllipsisV, faHeart, faTrash, faPlus, faSearch, faFilter, faEye, faEyeSlash, faDownload, faCog, faTimes, faCheck, faList, faTv, faHeadphones, faSave)

export default {
  components: { FontAwesomeIcon, UserPage, VideoHome, AddVideo, AddChannel, MusicHome, AddMusic, PlaylistView },
  setup() {
    const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'))
    const activeTab = ref(currentUser.value ? 'video' : 'user')
    const videoSubPage = ref('home')
    const musicSubPage = ref('home')
    const selectedPlaylist = ref(null)
    const navOpen = ref(false)

    const mode = computed(() => activeTab.value)
    const modeLabel = computed(() => activeTab.value === 'video' ? 'Video' : 'Music')

    const setUser = (user) => {
      currentUser.value = user
      localStorage.setItem('user', JSON.stringify(user))
      activeTab.value = 'video'
    }

    const navigate = (tab, subPage = null) => {
      activeTab.value = tab
      if (subPage) {
        if (tab === 'video') videoSubPage.value = subPage
        if (tab === 'music') musicSubPage.value = subPage
      }
      navOpen.value = false
    }

    const openPlaylist = (playlist) => {
      selectedPlaylist.value = playlist
      navOpen.value = false
    }

    return { currentUser, activeTab, videoSubPage, musicSubPage, selectedPlaylist, navOpen, mode, modeLabel, setUser, navigate, openPlaylist }
  }
}
</script>

<template>
   <div class="min-h-screen bg-black text-white">
    <UserPage v-if="activeTab === 'user'" @select="setUser" />
    <template v-else-if="activeTab === 'video'">
      <VideoHome v-if="videoSubPage === 'home'" :user="currentUser" @navigate="(p) => videoSubPage = p" />
      <AddVideo v-else-if="videoSubPage === 'add'" :user="currentUser" @back="videoSubPage = 'home'" />
      <AddChannel v-else-if="videoSubPage === 'channel'" :user="currentUser" @back="videoSubPage = 'home'" />
    </template>
    <template v-else-if="activeTab === 'music'">
      <MusicHome v-if="musicSubPage === 'home'" :user="currentUser" @navigate="(p) => musicSubPage = p" @open-playlist="openPlaylist" />
      <AddMusic v-else-if="musicSubPage === 'add'" :user="currentUser" @back="musicSubPage = 'home'" />
      <PlaylistView v-if="selectedPlaylist" :playlist="selectedPlaylist" :user="currentUser" @close="selectedPlaylist = null" />
    </template>
  </div>

  <!-- Top bar with nav toggle -->
  <div class="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-700 z-40 flex items-center p-3">
    <button @click="navOpen = !navOpen" class="text-white mr-3">
      <FontAwesomeIcon :icon="['fas', 'bars']" />
    </button>
    <span class="text-lg font-bold">{{ modeLabel }}</span>
  </div>

  <!-- Left nav menu -->
  <div v-if="navOpen" class="fixed inset-0 z-50" @click="navOpen = false">
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>
    <div class="absolute top-0 left-0 bottom-0 w-64 bg-gray-900 p-4 overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">Menu</h2>
        <button @click="navOpen = false" class="text-gray-400">
          <FontAwesomeIcon :icon="['fas', 'times']" />
        </button>
      </div>

      <div class="mb-4">
        <div class="text-xs text-gray-500 uppercase mb-2">Video</div>
        <button @click="navigate('video', 'home')" class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
          <FontAwesomeIcon :icon="['fas', 'home']" class="mr-2" /> Video Home
        </button>
        <button @click="navigate('video', 'add')" class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
          <FontAwesomeIcon :icon="['fas', 'plus']" class="mr-2" /> Add Video
        </button>
        <button @click="navigate('video', 'channel')" class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
          <FontAwesomeIcon :icon="['fas', 'tv']" class="mr-2" /> Add Channel
        </button>
      </div>

      <div class="mb-4">
        <div class="text-xs text-gray-500 uppercase mb-2">Music</div>
        <button @click="navigate('music', 'home')" class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
          <FontAwesomeIcon :icon="['fas', 'home']" class="mr-2" /> Music Home
        </button>
        <button @click="navigate('music', 'add')" class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
          <FontAwesomeIcon :icon="['fas', 'plus']" class="mr-2" /> Add Music
        </button>
      </div>
    </div>
  </div>

   </template>
