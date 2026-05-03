<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHome, faVideo, faMusic, faBars, faPlay, faPause, faForward, faBackward, faRandom, faRedo, faEllipsisV, faHeart, faTrash, faPlus, faSearch, faFilter, faEye, faEyeSlash, faDownload, faCog, faTimes, faCheck, faList, faTv, faHeadphones, faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { API } from './api.js'
import UserPage from './pages/UserPage.vue'
import VideoHome from './pages/VideoHome.vue'
import AddVideo from './pages/AddVideo.vue'
import AddChannel from './pages/AddChannel.vue'
import MusicHome from './pages/MusicHome.vue'
import AddMusic from './pages/AddMusic.vue'
import PlaylistView from './pages/PlaylistView.vue'

library.add(faHome, faVideo, faMusic, faBars, faPlay, faPause, faForward, faBackward, faRandom, faRedo, faEllipsisV, faHeart, faTrash, faPlus, faSearch, faFilter, faEye, faEyeSlash, faDownload, faCog, faTimes, faCheck, faList, faTv, faHeadphones, faSave, faArrowLeft)

const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'))
const savedState = JSON.parse(localStorage.getItem('hometube_state') || '{}')
const activeTab = ref(savedState.activeTab || (currentUser.value ? 'video' : 'user'))
const videoSubPage = ref(savedState.videoSubPage || 'home')
const musicSubPage = ref(savedState.musicSubPage || 'home')
const selectedPlaylist = ref(null)
const selectedPlaylistId = ref(savedState.selectedPlaylistId || null)
const navOpen = ref(false)
const installPrompt = ref(null)
const showInstall = ref(false)

const mode = computed(() => activeTab.value)
const modeLabel = computed(() => activeTab.value === 'video' ? 'Video' : 'Music')

const saveState = () => {
  const state = {
    activeTab: activeTab.value,
    videoSubPage: videoSubPage.value,
    musicSubPage: musicSubPage.value,
    selectedPlaylistId: selectedPlaylist.value?.id || null
  }
  localStorage.setItem('hometube_state', JSON.stringify(state))
  if (selectedPlaylist.value?.type === 'virtual') {
    localStorage.setItem('hometube_virtual_view', JSON.stringify({ type: 'virtual', name: selectedPlaylist.value.name }))
  } else {
    localStorage.removeItem('hometube_virtual_view')
  }
}

const setUser = (user) => {
  currentUser.value = user
  localStorage.setItem('user', JSON.stringify(user))
  activeTab.value = 'video'
  saveState()
}

const navigate = (tab, subPage = null) => {
  activeTab.value = tab
  if (subPage) {
    if (tab === 'video') videoSubPage.value = subPage
    if (tab === 'music') musicSubPage.value = subPage
  }
  navOpen.value = false
  saveState()
}

const openPlaylist = async (playlist) => {
  selectedPlaylist.value = playlist
  navOpen.value = false
  if (playlist.id) {
    saveState()
  }
}

const closePlaylist = () => {
  selectedPlaylist.value = null
  saveState()
}

const installApp = async () => {
  if (!installPrompt.value) return
  installPrompt.value.prompt()
  const { outcome } = await installPrompt.value.userChoice
  if (outcome === 'accepted') installPrompt.value = null
  showInstall.value = false
}

const handleBeforeInstallPrompt = (e) => {
  e.preventDefault()
  installPrompt.value = e
  showInstall.value = true
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  if (window.matchMedia('(display-mode: standalone)').matches) showInstall.value = false

  const virtualView = JSON.parse(localStorage.getItem('hometube_virtual_view') || 'null')
  if (virtualView && virtualView.type === 'virtual') {
    API.get('/music', { user_id: currentUser.value?.id }).then(songs => {
      selectedPlaylist.value = {
        type: 'virtual',
        name: virtualView.name,
        songs: virtualView.name === 'My Songs'
          ? songs.filter(m => m.added_by === currentUser.value?.id)
          : songs
      }
    })
  } else if (selectedPlaylistId.value) {
    API.get('/playlists', { user_id: currentUser.value?.id }).then(playlists => {
      const pl = playlists.find(p => p.id === selectedPlaylistId.value)
      if (pl) selectedPlaylist.value = pl
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
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
        <PlaylistView v-if="selectedPlaylist" :playlist="selectedPlaylist" :songs="selectedPlaylist.songs" :user="currentUser" @close="closePlaylist" />
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

      <div v-if="showInstall" class="mb-4">
        <div class="text-xs text-gray-500 uppercase mb-2">App</div>
        <button @click="installApp" class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
          <FontAwesomeIcon :icon="['fas', 'save']" class="mr-2" /> Install App
        </button>
      </div>
    </div>
  </div>

   </template>
