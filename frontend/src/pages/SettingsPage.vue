<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { isLocalMode, setLocalMode, setServerMode, getModeName } from '../api.js'

const router = useRouter()

const defaultSettings = {
  downloadOnPlay: true,
}

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
</script>

<template>
  <div class="p-4 pt-16">
    <div class="flex items-center gap-3 mb-6">
      <button @click="router.back()" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <h2 class="text-xl font-bold">Settings</h2>
    </div>

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

    <div class="mb-4">
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
  </div>
</template>
