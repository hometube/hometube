<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { API } from '../api.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

const props = defineProps(['user'])

const videos = ref([])
const filteredVideos = ref([])
const currentFilter = ref('my-feed')
const playingVideo = ref(null)
const playerRef = ref(null)
const player = ref(null)
const audioMode = ref(false)
const wakeLock = ref(null)

const filters = [
  { id: 'my-feed', label: 'My Feed' },
  { id: 'all', label: 'All Videos' },
  { id: 'unwatched', label: 'Unwatched' }
]

const load = async () => {
  if (!props.user) return
  const filter = currentFilter.value === 'my-feed' ? 'all' : currentFilter.value
  const data = await API.get('/videos', { user_id: props.user.id, filter })
  videos.value = data
  applyFilter()
}

const applyFilter = () => {
  if (currentFilter.value === 'my-feed') {
    filteredVideos.value = videos.value.filter(v => v.added_by === props.user.id)
  } else {
    filteredVideos.value = videos.value
  }
}

const setFilter = (filter) => {
  currentFilter.value = filter
  load()
}

const playVideo = async (vid) => {
  playingVideo.value = vid
  await API.post(`/videos/${vid.id}/watch`, { watched: true })
  await nextTick()
  if (playerRef.value && !player.value) {
    player.value = new Plyr(playerRef.value, {
      controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'speed', 'fullscreen'],
      speed: [0.5, 0.75, 1, 1.25, 1.5, 2]
    })
  }
  load()
}

const toggleAudioMode = async () => {
  audioMode.value = !audioMode.value
  if (audioMode.value && 'wakeLock' in navigator) {
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
    } catch (e) {}
  } else if (!audioMode.value && wakeLock.value) {
    wakeLock.value.release()
    wakeLock.value = null
  }
}

const toggleKeep = async (vid) => {
  await API.post(`/videos/${vid.id}/keep`, { keep: !vid.keep_flag })
  load()
}

watch(() => props.user, load, { immediate: true })
onMounted(load)
</script>

<template>
  <div class="p-4 pt-16" v-if="user">
    <div class="flex gap-2 mb-4 overflow-x-auto">
      <button v-for="f in filters" :key="f.id" @click="setFilter(f.id)"
        :class="['px-3 py-1 rounded-full text-sm whitespace-nowrap', currentFilter === f.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300']">
        {{ f.label }}
      </button>
    </div>

    <div v-if="playingVideo" class="mb-4 bg-gray-900 rounded-lg p-2">
      <video ref="playerRef" :src="`/api/files/videos/${playingVideo.video_id}.mp4`" controls class="w-full rounded" crossorigin="anonymous" />
      <div class="flex items-center justify-between mt-2">
        <span class="text-sm">{{ playingVideo.title }}</span>
        <div class="flex gap-2">
          <button @click="toggleAudioMode" :class="['px-3 py-1 rounded text-sm', audioMode ? 'bg-green-600' : 'bg-gray-700']">
            <FontAwesomeIcon :icon="['fas', 'headphones']" /> {{ audioMode ? 'On' : 'Off' }}
          </button>
          <button @click="toggleKeep(playingVideo)" :class="['px-3 py-1 rounded text-sm', playingVideo.keep_flag ? 'bg-yellow-600' : 'bg-gray-700']">
            <FontAwesomeIcon :icon="['fas', 'save']" /> {{ playingVideo.keep_flag ? 'Kept' : 'Keep' }}
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="v in filteredVideos" :key="v.id" class="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
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
