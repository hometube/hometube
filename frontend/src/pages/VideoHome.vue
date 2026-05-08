<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { useUserStore } from '../stores/user.js'
import { useVideoStore } from '../stores/video.js'

const userStore = useUserStore()
const videoStore = useVideoStore()

const playerRef = ref(null)
const player = ref(null)

const playVideo = async (vid) => {
  await videoStore.playVideo(vid)
  await nextTick()
  if (playerRef.value && !player.value) {
    player.value = new Plyr(playerRef.value, {
      controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'speed', 'fullscreen'],
      speed: [0.5, 0.75, 1, 1.25, 1.5, 2]
    })
  }
}

watch(() => userStore.user, () => videoStore.load(), { immediate: true })
onMounted(() => videoStore.load())
</script>

<template>
  <div class="p-4 pt-16">
    <div class="flex gap-2 mb-4 overflow-x-auto">
      <button v-for="f in videoStore.filters" :key="f.id" @click="videoStore.setFilter(f.id)"
        :class="['px-3 py-1 rounded-full text-sm whitespace-nowrap', videoStore.currentFilter === f.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300']">
        {{ f.label }}
      </button>
    </div>

    <div v-if="videoStore.playingVideo" class="mb-4 bg-gray-900 rounded-lg p-2">
      <video ref="playerRef" :src="`/api/files/videos/${videoStore.playingVideo.video_id}.mp4`" controls class="w-full rounded" crossorigin="anonymous" />
      <div class="flex items-center justify-between mt-2">
        <span class="text-sm">{{ videoStore.playingVideo.title }}</span>
        <div class="flex gap-2">
          <button @click="videoStore.toggleAudioMode()" :class="['px-3 py-1 rounded text-sm', videoStore.audioMode ? 'bg-green-600' : 'bg-gray-700']">
            <FontAwesomeIcon :icon="['fas', 'headphones']" /> {{ videoStore.audioMode ? 'On' : 'Off' }}
          </button>
          <button @click="videoStore.toggleKeep(videoStore.playingVideo)" :class="['px-3 py-1 rounded text-sm', videoStore.playingVideo.keep_flag ? 'bg-yellow-600' : 'bg-gray-700']">
            <FontAwesomeIcon :icon="['fas', 'save']" /> {{ videoStore.playingVideo.keep_flag ? 'Kept' : 'Keep' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="videoStore.filteredVideos.length === 0" class="text-center py-8 text-gray-500">
      No videos found. Go to Add Video to get started!
    </div>
    <div v-else class="space-y-2">
      <div v-for="v in videoStore.filteredVideos" :key="v.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
        <div class="flex-1 cursor-pointer" @click="playVideo(v)">
          <div class="text-sm font-medium">{{ v.title }}</div>
          <div class="flex gap-2 mt-1">
            <span v-if="v.watched_at" class="text-xs text-gray-400"><FontAwesomeIcon :icon="['fas', 'eye']" /> Watched</span>
            <span v-if="v.keep_flag" class="text-xs text-yellow-400"><FontAwesomeIcon :icon="['fas', 'save']" /> Kept</span>
            <span v-if="v.downloaded" class="text-xs text-green-400">Downloaded</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button v-if="!v.downloaded" @click="API.post(`/videos/${v.id}/download`, { quality: v.quality })" class="px-2 py-1 bg-blue-600 rounded text-xs">
            <FontAwesomeIcon :icon="['fas', 'download']" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
