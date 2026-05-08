<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faEye, faBackward, faPlay, faPause, faForward, faRedo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useMusicStore } from '../stores/music.js'
import WaveformVisual from './WaveformVisual.vue'

library.add(faEye, faBackward, faPlay, faPause, faForward, faRedo)

const router = useRouter()
const route = useRoute()
const musicStore = useMusicStore()

const {
  audio,
  playlistId,
  currentIndex,
  playing,
  currentSong,
  togglePlay,
  next,
  prev,
  repeat,
  toggleRepeat,
  isCurrentPlaylist,
  cleanTitle,
  currentTime
} = musicStore

const onPlaylistPage = computed(() => {
  if (!route.path.startsWith('/music/playlist/')) return false
  const id = route.params.id || route.path.split('/').pop()
  return isCurrentPlaylist(String(id))
})

const goToCurrentPlaylist = () => {
  if (playlistId.value) {
    router.push(`/music/playlist/${playlistId.value}`)
  }
}
</script>

<template>
  <div v-if="currentIndex >= 0" class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-3 z-[90]">
    <WaveformVisual :audioElement="audio" :playing="playing" :subtle="!onPlaylistPage" />
    <div class="absolute top-0 left-0 right-0">
      <div class="h-1 bg-gray-200" :style="{ width: `${(currentTime / currentSong.duration) * 100}%` }"></div>
    </div>
    <div class="text-center mb-2">
      <span class="text-sm font-medium truncate">{{ cleanTitle(currentSong.title) }}</span>
      •
      <span class="text-xs text-gray-400 truncate">{{ currentSong.artist }}</span>
    </div>
    <div class="flex items-center justify-center gap-10">
      <button @click="goToCurrentPlaylist" :class="onPlaylistPage ? 'text-gray-400/70' : 'text-white'" class="w-6">
        <FontAwesomeIcon :icon="['fas', 'eye']" />
      </button>
      <button @click="prev" class="text-white">
        <FontAwesomeIcon :icon="['fas', 'backward']" />
      </button>
      <button @click="togglePlay" class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
        <FontAwesomeIcon :icon="['fas', playing ? 'pause' : 'play']" />
      </button>
      <button @click="next" class="text-white">
        <FontAwesomeIcon :icon="['fas', 'forward']" />
      </button>
      <button @click="toggleRepeat" :class="repeat ? 'text-white' : 'text-gray-400/70'" class="w-6">
        <FontAwesomeIcon :icon="['fas', 'redo']" />
      </button>
    </div>
  </div>
</template>
