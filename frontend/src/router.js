import { createRouter, createWebHistory } from 'vue-router'
import UserPage from './pages/UserPage.vue'
import VideoHome from './pages/VideoHome.vue'
import AddVideo from './pages/AddVideo.vue'
import AddChannel from './pages/AddChannel.vue'
import MusicHome from './pages/MusicHome.vue'
import AddMusic from './pages/AddMusic.vue'
import PlaylistView from './pages/PlaylistView.vue'
import AboutPage from './pages/AboutPage.vue'
import SetupBackend from './pages/SetupBackend.vue'
import SetupUser from './pages/SetupUser.vue'
import { API } from './api.js'

const routes = [
  { path: '/', redirect: '/setup' },
  { path: '/setup', name: 'setup-backend', component: SetupBackend },
  { path: '/setup/user', name: 'setup-user', component: SetupUser },
  { path: '/about', name: 'about', component: AboutPage },
  { path: '/user', name: 'user', component: UserPage },
  { path: '/video', name: 'video', component: VideoHome },
  { path: '/video/add', name: 'video-add', component: AddVideo },
  { path: '/video/channel', name: 'video-channel', component: AddChannel },
  { path: '/music', name: 'music', component: MusicHome },
  { path: '/music/add', name: 'music-add', component: AddMusic },
  { path: '/music/playlist/:id', name: 'playlist', component: PlaylistView, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const backendUrl = localStorage.getItem('backendUrl') || ''
  
  // Define routes that require authentication
  const authRequiredRoutes = ['video', 'video-add', 'video-channel', 'music', 'music-add', 'playlist']
  const isAuthRequired = authRequiredRoutes.includes(to.name)
  
  // If no backend URL configured, redirect to setup backend
  if (!backendUrl.trim() && !['setup-backend', 'about'].includes(to.name)) {
    next('/setup')
  } 
  // If backend URL configured but no user, and trying to access auth-required routes, redirect to setup user
  else if (backendUrl.trim() && !user && isAuthRequired) {
    next('/setup/user')
  } 
  // If both configured and trying to access setup pages, redirect to home
  else if (backendUrl.trim() && user && ['setup-backend', 'setup-user'].includes(to.name)) {
    next('/')
  } else {
    next()
  }
})

export default router
