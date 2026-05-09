<script setup>
import { ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps({
  song: { type: Object, default: null },
  playlist: { type: Object, default: null },
  hasActiveQueue: { type: Boolean, default: false },
  inQueue: { type: Boolean, default: false },
  downloaded: { type: Boolean, default: false },
  otherPlaylists: { type: Array, default: () => [] },
  cleanTitle: { type: Function, default: (t) => t || '' },
})

const emit = defineEmits([
  'close',
  'play',
  'play-next',
  'add-to-queue',
  'remove-from-queue',
  'remove-from-playlist',
  'add-to-playlist',
  'create-new-playlist',
  'download',
  'delete',
])

const showPlaylistSubmenu = ref(false)

function handleClose() {
  showPlaylistSubmenu.value = false
  emit('close')
}
</script>

<template>
  <Teleport to="#popover-portal">
    <div v-if="song" class="fixed inset-0 z-50 flex items-end" @click.self="handleClose">
      <div class="absolute inset-0 bg-black/50" @click="handleClose" />
      <div class="relative w-full bg-gray-800 rounded-t-xl p-4 pb-8 max-h-[70vh] overflow-y-auto">
        <div v-if="!showPlaylistSubmenu">
          <div class="text-center mb-4 pb-2 border-b border-gray-700">
            <div class="text-sm font-medium">{{ cleanTitle(song.title) }}</div>
            <div class="text-xs text-gray-400">{{ song.artist }}</div>
          </div>
          <button @click="emit('play'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3">
            <FontAwesomeIcon :icon="['fas', 'play']" class="w-5" /><span>Play</span>
          </button>
          <button v-if="hasActiveQueue" @click="emit('play-next'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3">
            <FontAwesomeIcon :icon="['fas', 'forward-step']" class="w-5" /><span>Play Next</span>
          </button>
          <button v-if="hasActiveQueue && !inQueue" @click="emit('add-to-queue'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3">
            <FontAwesomeIcon :icon="['fas', 'list']" class="w-5" /><span>Add to Queue</span>
          </button>
          <button @click="showPlaylistSubmenu = true" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3">
            <FontAwesomeIcon :icon="['fas', 'plus']" class="w-5" /><span>Add to Playlist</span>
          </button>
          <button v-if="inQueue" @click="emit('remove-from-queue'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3">
            <FontAwesomeIcon :icon="['fas', 'minus']" class="w-5" /><span>Remove from Queue</span>
          </button>
          <button v-if="playlist && playlist.type !== 'virtual'" @click="emit('remove-from-playlist'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 text-red-400">
            <FontAwesomeIcon :icon="['fas', 'trash']" class="w-5" /><span>Remove from Playlist</span>
          </button>
          <button v-if="downloaded" disabled class="w-full text-left py-3 px-2 rounded flex items-center gap-3 text-green-400">
            <FontAwesomeIcon :icon="['fas', 'check']" class="w-5" /><span>Downloaded</span>
          </button>
          <button v-else @click="emit('download'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 text-blue-400">
            <FontAwesomeIcon :icon="['fas', 'download']" class="w-5" /><span>Download</span>
          </button>
          <button @click="emit('delete'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 text-red-400">
            <FontAwesomeIcon :icon="['fas', 'trash']" class="w-5" /><span>Delete Song</span>
          </button>
          <button @click="handleClose" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 mt-2 border-t border-gray-700 pt-3 text-gray-400">
            <FontAwesomeIcon :icon="['fas', 'times']" class="w-5" /><span>Cancel</span>
          </button>
        </div>
        <div v-else>
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
            <button @click="showPlaylistSubmenu = false" class="text-gray-400">
              <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
            </button>
            <span class="font-medium text-sm">Add to Playlist</span>
            <div class="w-4" />
          </div>
          <button @click="emit('create-new-playlist'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 text-green-400">
            <FontAwesomeIcon :icon="['fas', 'plus-circle']" class="w-5" /><span>Create New Playlist</span>
          </button>
          <div v-for="pl in otherPlaylists" :key="pl.id" @click="emit('add-to-playlist', pl); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded cursor-pointer flex items-center gap-3">
            <FontAwesomeIcon :icon="['fas', 'music']" class="w-5 text-gray-400" /><span>{{ pl.name }}</span>
          </div>
          <button v-if="otherPlaylists.length === 0" disabled class="w-full text-left py-3 px-2 text-gray-500">
            No other playlists
          </button>
          <button @click="handleClose" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 mt-2 border-t border-gray-700 pt-3 text-gray-400">
            <FontAwesomeIcon :icon="['fas', 'times']" class="w-5" /><span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
