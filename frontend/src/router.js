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
  
  // If no backend URL configured, redirect to setup backend
  if (!backendUrl.trim() && to.name !== 'setup-backend' && to.name !== 'about') {
    next('/setup')
  } 
  // If backend URL configured but no user, redirect to setup user
  else if (backendUrl.trim() && !user && to.name !== 'setup-user' && to.name !== 'setup-backend' && to.name !== 'about') {
    next('/setup/user')
  } 
  // If both configured, allow access to all routes except setup pages
  else if (backendUrl.trim() && user && (to.name === 'setup-backend' || to.name === 'setup-user')) {
    next('/')
  } else {
    next()
  }
})

export default router
