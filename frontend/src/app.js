import { API } from './api.js'
import { renderUserPage } from './pages/user.js'
import { renderVideoPage } from './pages/video.js'
import { renderMusicPage } from './pages/music.js'

let currentUser = JSON.parse(localStorage.getItem('user') || 'null')

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById(page + '-page').classList.add('active')
  document.querySelector(`[data-page="${page}"]`).classList.add('active')

  if (page === 'user') renderUserPage()
  if (page === 'video') renderVideoPage()
  if (page === 'music') renderMusicPage()
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page))
})

if (!currentUser) navigate('user')
else navigate('video')
