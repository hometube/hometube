import { API } from '../api.js'

export function renderUserPage() {
  const page = document.getElementById('user-page')
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')

  async function loadUsers() {
    const users = await API.get('/users')
    page.innerHTML = `
      <h2>Select User</h2>
      <input id="username" placeholder="Enter username" value="${currentUser ? currentUser.username : ''}" />
      <button id="save-user">${currentUser ? 'Switch User' : 'Select User'}</button>
      <h3>Existing Users</h3>
      ${users.map(u => `<div class="card">${u.username} <button data-id="${u.id}" data-name="${u.username}" class="select-existing">Select</button></div>`).join('')}
    `
    document.getElementById('save-user').onclick = async () => {
      const name = document.getElementById('username').value.trim()
      if (!name) return
      const user = await API.post('/users', { username: name })
      localStorage.setItem('user', JSON.stringify(user))
      location.reload()
    }
    document.querySelectorAll('.select-existing').forEach(btn => {
      btn.onclick = () => {
        localStorage.setItem('user', JSON.stringify({ id: btn.dataset.id, username: btn.dataset.name }))
        location.reload()
      }
    })
  }
  loadUsers()
}
