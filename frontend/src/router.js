import { createRouter, createWebHashHistory } from 'vue-router'
import UserPage from './pages/UserPage.vue'
import VideoHome from './pages/VideoHome.vue'
import AddVideo from './pages/AddVideo.vue'
import AddChannel from './pages/AddChannel.vue'
import MusicHome from './pages/MusicHome.vue'
import AddMusic from './pages/AddMusic.vue'
import PlaylistView from './pages/PlaylistView.vue'
import { API } from './api.js'

const routes = [
  { path: '/', redirect: '/user' },
  { path: '/user', name: 'user', component: UserPage },
  { path: '/video', name: 'video', component: VideoHome },
  { path: '/video/add', name: 'video-add', component: AddVideo },
  { path: '/video/channel', name: 'video-channel', component: AddChannel },
  { path: '/music', name: 'music', component: MusicHome },
  { path: '/music/add', name: 'music-add', component: AddMusic },
  { path: '/music/playlist/:id', name: 'playlist', component: PlaylistView, props: true }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (!user && to.name !== 'user') {
    next('/user')
  } else {
    next()
  }
})

export default router
