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
  { path: '/', name: 'home', component: AboutPage },
  { path: '/setup', name: 'setup-backend', component: SetupBackend },
  { path: '/setup/user', name: 'setup-user', component: SetupUser },
  { path: '/user', name: 'user', component: UserPage },
  { path: '/video', name: 'video', component: VideoHome },
  { path: '/video/add', name: 'video-add', component: AddVideo },
  { path: '/video/channel', name: 'video-channel', component: AddChannel },
  { path: '/music', name: 'music', component: MusicHome },
  { path: '/music/add', name: 'music-add', component: AddMusic },
  { path: '/music/playlist/:id', name: 'playlist', component: PlaylistView, props: true }
]

const setupRoutes = ['setup-backend', 'setup-user', 'user']

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const backendUrl = localStorage.getItem('backendUrl') || ''

  const hasBackend = backendUrl.trim().length > 0
  const hasUser = !!user

  if (to.name === 'home') {
    next()
    return
  }

  if (setupRoutes.includes(to.name)) {
    if (hasBackend && hasUser) {
      next('/')
      return
    }
    next()
    return
  }

  if (!hasBackend) {
    next('/setup')
    return
  }

  if (!hasUser) {
    next('/setup/user')
    return
  }

  next()
})

export default router
