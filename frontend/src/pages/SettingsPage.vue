<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { isLocalMode, setLocalMode, setServerMode, getModeName } from '../api.js'

const router = useRouter()

const defaultSettings = {
  downloadOnPlay: true,
  defaultVideoQuality: 'best',
  defaultVideoFilter: 'my-feed',
  autoDownloadVideo: true,
  defaultShuffle: false,
  defaultRepeat: false,
  showWaveform: true,
  defaultSubQuality: 'best',
}

const qualityOptions = [
  { id: 'best', label: 'Best' },
  { id: 'best[height<=1080]', label: '1080p' },
  { id: 'best[height<=720]', label: '720p' },
  { id: 'best[height<=480]', label: '480p' }
]

const filterOptions = [
  { id: 'my-feed', label: 'My Feed' },
  { id: 'all', label: 'All Videos' },
  { id: 'unwatched', label: 'Unwatched' }
]

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem('settings') || '{}') }
  } catch {
    return { ...defaultSettings }
  }
}

const settings = ref(loadSettings())

watch(settings.value, () => {
  localStorage.setItem('settings', JSON.stringify(settings.value))
}, { deep: true })

const toggle = (key) => {
  settings.value[key] = !settings.value[key]
}

const currentMode = computed(() => getModeName())

const switchMode = () => {
  const msg = isLocalMode()
    ? 'Switch to server mode? Your local data will be preserved.'
    : 'Switch to local mode? Your server connection settings will be preserved.'
  if (!confirm(msg)) return
  if (isLocalMode()) {
    setServerMode()
  } else {
    setLocalMode(true)
  }
  window.location.reload()
}

const resetApp = () => {
  if (!confirm('This will clear all local data, including settings and IndexedDB data. Are you sure?')) return
  if (!confirm('Really reset? All your data will be lost!')) return
  localStorage.clear()
  if (window.indexedDB) {
    window.indexedDB.databases().then(dbs => {
      dbs.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name) })
    })
  }
  window.location.reload()
}
</script>

<template>
  <div class="p-4 pt-14">

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Mode</div>
      <div class="bg-gray-800 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">{{ currentMode }}</div>
            <div class="text-xs text-gray-400">
              {{ isLocalMode() ? 'Using local IndexedDB storage' : 'Connected to backend server' }}
            </div>
          </div>
          <button @click="switchMode"
            class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">
            Switch to {{ isLocalMode() ? 'Server' : 'Local' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="!isLocalMode()" class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Music</div>
      <div class="bg-gray-800 rounded-lg">
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Download on Play</div>
            <div class="text-xs text-gray-400">Automatically cache songs for offline listening when played</div>
          </div>
          <button @click="toggle('downloadOnPlay')"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="settings.downloadOnPlay ? 'bg-blue-500' : 'bg-gray-600'">
            <div class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="settings.downloadOnPlay ? 'translate-x-6' : 'translate-x-0.5'" />
          </button>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Video</div>
      <div class="bg-gray-800 rounded-lg divide-y divide-gray-700">
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Default Quality</div>
            <div class="text-xs text-gray-400">Quality pre-selected when adding a video</div>
          </div>
          <select v-model="settings.defaultVideoQuality"
            class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
            <option v-for="o in qualityOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </div>
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Default Filter</div>
            <div class="text-xs text-gray-400">Default video feed filter</div>
          </div>
          <select v-model="settings.defaultVideoFilter"
            class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
            <option v-for="o in filterOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </div>
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Auto-Download Videos</div>
            <div class="text-xs text-gray-400">Automatically download after adding a video</div>
          </div>
          <button @click="toggle('autoDownloadVideo')"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="settings.autoDownloadVideo ? 'bg-blue-500' : 'bg-gray-600'">
            <div class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="settings.autoDownloadVideo ? 'translate-x-6' : 'translate-x-0.5'" />
          </button>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Music</div>
      <div class="bg-gray-800 rounded-lg divide-y divide-gray-700">
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Default Shuffle</div>
            <div class="text-xs text-gray-400">Shuffle enabled by default when opening a playlist</div>
          </div>
          <button @click="toggle('defaultShuffle')"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="settings.defaultShuffle ? 'bg-blue-500' : 'bg-gray-600'">
            <div class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="settings.defaultShuffle ? 'translate-x-6' : 'translate-x-0.5'" />
          </button>
        </div>
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Default Repeat</div>
            <div class="text-xs text-gray-400">Repeat enabled by default when opening a playlist</div>
          </div>
          <button @click="toggle('defaultRepeat')"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="settings.defaultRepeat ? 'bg-blue-500' : 'bg-gray-600'">
            <div class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="settings.defaultRepeat ? 'translate-x-6' : 'translate-x-0.5'" />
          </button>
        </div>
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Waveform Visualizer</div>
            <div class="text-xs text-gray-400">Animated waveform during music playback</div>
          </div>
          <button @click="toggle('showWaveform')"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="settings.showWaveform ? 'bg-blue-500' : 'bg-gray-600'">
            <div class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="settings.showWaveform ? 'translate-x-6' : 'translate-x-0.5'" />
          </button>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">Subscriptions</div>
      <div class="bg-gray-800 rounded-lg">
        <div class="flex items-center justify-between p-4">
          <div>
            <div class="text-sm font-medium">Default Quality</div>
            <div class="text-xs text-gray-400">Quality used for subscription downloads</div>
          </div>
          <select v-model="settings.defaultSubQuality"
            class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
            <option v-for="o in qualityOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="mb-4">
      <div class="text-xs text-gray-500 uppercase mb-2">App</div>
      <div class="bg-gray-800 rounded-lg divide-y divide-gray-700">
        <button @click="router.push('/debug')"
          class="w-full flex items-center justify-between p-4 hover:bg-gray-750 rounded-t-lg">
          <div>
            <div class="text-sm font-medium">Debug View</div>
            <div class="text-xs text-gray-400">Inspect full database contents as JSON</div>
          </div>
          <FontAwesomeIcon :icon="['fas', 'bug']" class="text-gray-400" />
        </button>
        <button @click="resetApp"
          class="w-full flex items-center justify-between p-4 hover:bg-gray-750 rounded-lg">
          <div>
            <div class="text-sm font-medium text-red-400">Reset App</div>
            <div class="text-xs text-gray-400">Clear all local data and restore defaults</div>
          </div>
          <FontAwesomeIcon :icon="['fas', 'trash']" class="text-red-400" />
        </button>
      </div>
    </div>
  </div>
</template>
