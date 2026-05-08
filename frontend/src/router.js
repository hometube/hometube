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
  { path: '/setup', name: 'setup-backend', component: SetupBackend, meta: { isSetup: true } },
  { path: '/setup/user', name: 'setup-user', component: SetupUser, meta: { isSetup: true } },
  { path: '/user', name: 'user', component: UserPage, meta: { isSetup: true } },
  { path: '/video', name: 'video', component: VideoHome, meta: { requiresUser: true } },
  { path: '/video/add', name: 'video-add', component: AddVideo, meta: { requiresUser: true } },
  { path: '/video/channel', name: 'video-channel', component: AddChannel, meta: { requiresUser: true } },
  { path: '/music', name: 'music', component: MusicHome, meta: { requiresUser: true } },
  { path: '/music/add', name: 'music-add', component: AddMusic, meta: { requiresUser: true } },
  { path: '/music/playlist/:id', name: 'playlist', component: PlaylistView, props: true, meta: { requiresUser: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const backendUrl = localStorage.getItem('backendUrl') || ''
  const lastVisited = localStorage.getItem('lastVisited') || '/video'

  const hasBackend = backendUrl.trim().length > 0
  const hasUser = !!user && typeof user === 'object' && 'id' in user

  // Save current route as last visited (for non-setup, non-home routes)
  if (!to.meta.isSetup && to.name !== 'home') {
    localStorage.setItem('lastVisited', to.fullPath)
  }

  // Home route: if user exists, redirect to last visited
  if (to.name === 'home') {
    if (hasUser) {
      next(lastVisited)
      return
    }
    next()
    return
  }

  // Setup routes: if backend+user exist, redirect to home
  if (to.meta.isSetup) {
    if (hasBackend && hasUser) {
      next('/')
      return
    }
    next()
    return
  }

  // Routes requiring user: check backend and user
  if (to.meta.requiresUser) {
    if (!hasBackend) {
      next('/setup')
      return
    }
    if (!hasUser) {
      next('/setup/user')
      return
    }
  }

  next()
})

export default router
