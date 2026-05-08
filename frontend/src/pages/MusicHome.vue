<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useUserStore } from '../stores/user.js'
import { useMusicStore } from '../stores/music.js'

const router = useRouter()
const userStore = useUserStore()
const musicStore = useMusicStore()

watch(() => userStore.user, (user) => {
  if (user) musicStore.load()
}, { immediate: true })

onMounted(() => {
  if (userStore.user) musicStore.load()
})

const openPlaylist = (pl) => {
  router.push(`/music/playlist/${pl.id}`)
}

const openVirtual = (vp) => {
  router.push(`/music/playlist/${vp.id}`)
}
</script>

<template>
  <div class="p-4 pt-16">
    <div class="mb-4">
      <h2 class="text-xl font-bold mb-2">Playlists</h2>
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div v-for="vp in musicStore.virtualPlaylists" :key="vp.id" @click="openVirtual(vp)"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700">
          <div class="font-medium">{{ vp.name }}</div>
          <div class="text-xs text-gray-400">{{ vp.songs.length }} songs</div>
        </div>
      </div>
      <div v-if="musicStore.playlists.length === 0" class="text-center py-8 text-gray-500">
        No playlists yet. Add music to create one.
      </div>
      <div v-else class="space-y-2">
        <div v-for="pl in musicStore.playlists" :key="pl.id" @click="openPlaylist(pl)"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700">
          <div class="font-medium">{{ pl.name }}</div>
        </div>
      </div>
    </div>
    <button @click="router.push('/music/add')" class="w-full p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 text-sm">
      + Add Music
    </button>
  </div>
</template>
