<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faBars, faTimes, faHome, faPlus, faTv, faSave, faRandom, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useUserStore } from './stores/user.js'
import { useMusicStore } from './stores/music.js'
import GlobalMusicPlayer from './components/GlobalMusicPlayer.vue'

library.add(faBars, faTimes, faHome, faPlus, faTv, faSave, faRandom, faArrowLeft)

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const musicStore = useMusicStore()

const {
  currentIndex,
  playing,
  togglePlay,
  init,
  restoreState
} = musicStore

const navOpen = ref(false)
const installPrompt = ref(null)
const showInstall = ref(false)

const mode = computed(() => {
  if (route.path.startsWith('/video')) return 'video'
  if (route.path.startsWith('/music')) return 'music'
  return 'setup'
})
const modeLabel = computed(() => mode.value === 'video' ? 'Video' : 'Music')
const hideNavbar = computed(() => mode.value === 'setup')

const navigate = (tab, subPage = null) => {
  navOpen.value = false
  if (tab === 'video') {
    router.push(subPage === 'add' ? '/video/add' : subPage === 'channel' ? '/video/channel' : '/video')
  } else if (tab === 'music') {
    router.push(subPage === 'add' ? '/music/add' : '/music')
  }
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

// Pause music when navigating to video pages
watch(() => route.path, (newPath, oldPath) => {
  if (newPath.startsWith('/video') && playing.value && !oldPath.startsWith('/video')) {
    togglePlay()
  }
})

onMounted(async () => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  if (window.matchMedia('(display-mode: standalone)').matches) showInstall.value = false
  init()
  await restoreState()
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script>

<template>
  <div class="min-h-screen bg-black text-white" :class="{ 'pt-[60px]': hideNavbar }">
    <!-- Top bar with nav toggle -->
    <div v-if="!hideNavbar" class="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-700 z-[100] flex items-center p-3">
      <button @click="navOpen = !navOpen" class="text-white mr-3">
        <FontAwesomeIcon :icon="['fas', 'bars']" />
      </button>
      <span class="text-lg font-bold">{{ modeLabel }}</span>
    </div>

    <!-- Left nav menu -->
    <div v-if="!hideNavbar && navOpen" class="fixed inset-0 z-[100]" @click="navOpen = false">
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
          <button @click="navigate('video', 'home')"
            class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
            <FontAwesomeIcon :icon="['fas', 'home']" class="mr-2" /> Video Home
          </button>
          <button @click="navigate('video', 'add')"
            class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
            <FontAwesomeIcon :icon="['fas', 'plus']" class="mr-2" /> Add Video
          </button>
          <button @click="navigate('video', 'channel')"
            class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
            <FontAwesomeIcon :icon="['fas', 'tv']" class="mr-2" /> Add Channel
          </button>
        </div>

        <div class="mb-4">
          <div class="text-xs text-gray-500 uppercase mb-2">Music</div>
          <button @click="navigate('music', 'home')"
            class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
            <FontAwesomeIcon :icon="['fas', 'home']" class="mr-2" /> Music Home
          </button>
          <button @click="navigate('music', 'add')"
            class="block w-full text-left p-2 rounded hover:bg-gray-800 text-white">
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

    <router-view />

    <!-- Global Music Player -->
    <GlobalMusicPlayer />
  </div>
</template>
