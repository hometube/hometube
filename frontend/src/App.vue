<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faHome, faVideo, faMusic, faBars, faPlay, faPause, faForward, faBackward, faRandom, faRedo, faEllipsisV, faHeart, faTrash, faPlus, faSearch, faFilter, faEye, faEyeSlash, faDownload, faCog, faTimes, faCheck, faList, faTv, faHeadphones, faSave, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { API } from './api.js'

library.add(faHome, faVideo, faMusic, faBars, faPlay, faPause, faForward, faBackward, faRandom, faRedo, faEllipsisV, faHeart, faTrash, faPlus, faSearch, faFilter, faEye, faEyeSlash, faDownload, faCog, faTimes, faCheck, faList, faTv, faHeadphones, faSave, faArrowLeft)

const router = useRouter()
const route = useRoute()

const currentUser = ref(JSON.parse(localStorage.getItem('user') || 'null'))
const navOpen = ref(false)
const installPrompt = ref(null)
const showInstall = ref(false)

const mode = computed(() => {
  if (route.path.startsWith('/video')) return 'video'
  if (route.path.startsWith('/music')) return 'music'
  return 'user'
})
const modeLabel = computed(() => mode.value === 'video' ? 'Video' : 'Music')

const setUser = (user) => {
  currentUser.value = user
  localStorage.setItem('user', JSON.stringify(user))
  router.push('/video')
}

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

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  if (window.matchMedia('(display-mode: standalone)').matches) showInstall.value = false
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
</script>

<template>
   <div class="min-h-screen bg-black text-white">
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

     <router-view :user="currentUser" @select="setUser" />
   </div>
</template>
