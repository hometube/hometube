import { API } from '../api.js'

export function renderVideoPage() {
  const page = document.getElementById('video-page')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (!user) { page.innerHTML = '<p>Select a user first</p>'; return }

  async function load() {
    const [videos, channels] = await Promise.all([
      API.get('/videos', { user_id: user.id }),
      API.get('/channels')
    ])
    page.innerHTML = `
      <h2>Video Mode</h2>
      <select id="action">
        <option value="link">Add Video by Link</option>
        <option value="channel">Add Channel</option>
      </select>
      <input id="url" placeholder="Paste video or channel URL" />
      <button id="add-btn">Add</button>
      <h3>Channels</h3>
      ${channels.map(c => `<div class="card">${c.name} <button data-id="${c.id}" class="sub-btn">Subscribe</button></div>`).join('')}
      <h3>Videos</h3>
      ${videos.map(v => `<div class="card">${v.title} ${v.downloaded ? '<span class="tag">Downloaded</span>' : `<button data-id="${v.id}" class="dl-btn">Download</button>`}</div>`).join('')}
    `
    document.getElementById('add-btn').onclick = async () => {
      const url = document.getElementById('url').value
      const action = document.getElementById('action').value
      if (action === 'link') await API.post('/videos/add', { url, user_id: user.id })
      else await API.post('/channels/add', { url })
      load()
    }
    document.querySelectorAll('.sub-btn').forEach(btn => {
      btn.onclick = async () => {
        const criteria = prompt('Criteria (keywords comma-separated):')
        await API.post(`/channels/${btn.dataset.id}/subscribe`, { user_id: user.id, criteria: criteria ? { keywords: criteria.split(',') } : {} })
        load()
      }
    })
    document.querySelectorAll('.dl-btn').forEach(btn => {
      btn.onclick = async () => {
        await API.post(`/videos/${btn.dataset.id}/download`, { user_id: user.id })
        load()
      }
    })
  }
  load()
}
