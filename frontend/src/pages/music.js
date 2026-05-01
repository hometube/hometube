import { API } from '../api.js'

export function renderMusicPage() {
  const page = document.getElementById('music-page')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (!user) { page.innerHTML = '<p>Select a user first</p>'; return }

  async function load() {
    const music = await API.get('/music', { user_id: user.id })
    page.innerHTML = `
      <h2>Music Mode</h2>
      <input id="url" placeholder="Paste song or playlist URL" />
      <button id="add-btn">Add Music</button>
      <h3>Your Music</h3>
      ${music.map(m => `<div class="card">${m.title} ${m.artist ? `<span class="tag">${m.artist}</span>` : ''} ${m.is_playlist ? '<span class="tag">Playlist</span>' : ''} ${m.downloaded ? '<span class="tag">Downloaded</span>' : `<button data-id="${m.id}" class="dl-btn">Download</button>`}</div>`).join('')}
    `
    document.getElementById('add-btn').onclick = async () => {
      const url = document.getElementById('url').value
      await API.post('/music/add', { url, user_id: user.id })
      load()
    }
    document.querySelectorAll('.dl-btn').forEach(btn => {
      btn.onclick = async () => {
        await API.post(`/music/${btn.dataset.id}/download`, { user_id: user.id })
        load()
      }
    })
  }
  load()
}
