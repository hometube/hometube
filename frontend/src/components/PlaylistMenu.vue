<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps({
  playlist: { type: Object, default: null },
})

const emit = defineEmits([
  'close',
  'download',
  'rename',
  'delete',
])

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="#popover-portal">
    <div class="fixed inset-0 z-50 flex items-end" @click.self="handleClose">
      <div class="absolute inset-0 bg-black/50" @click="handleClose" />
      <div class="relative w-full bg-gray-800 rounded-t-xl p-4 pb-8 max-h-[70vh] overflow-y-auto">
        <div class="text-center mb-4 pb-2 border-b border-gray-700">
          <div class="text-sm font-medium">{{ playlist?.name }}</div>
        </div>

        <button v-if="playlist && playlist.type !== 'virtual'" @click="emit('download'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 text-blue-400">
          <FontAwesomeIcon :icon="['fas', 'download']" class="w-5" /><span>Download All</span>
        </button>

        <button v-if="playlist && playlist.type !== 'virtual'" @click="emit('rename'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3">
          <FontAwesomeIcon :icon="['fas', 'pencil']" class="w-5" /><span>Rename Playlist</span>
        </button>

        <button @click="emit('delete'); handleClose()" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 text-red-400">
          <FontAwesomeIcon :icon="['fas', 'trash']" class="w-5" /><span>Delete Playlist</span>
        </button>

        <button @click="handleClose" class="w-full text-left py-3 px-2 hover:bg-gray-700 rounded flex items-center gap-3 mt-2 border-t border-gray-700 pt-3 text-gray-400">
          <FontAwesomeIcon :icon="['fas', 'times']" class="w-5" /><span>Cancel</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
