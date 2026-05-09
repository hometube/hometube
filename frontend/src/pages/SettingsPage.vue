<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

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
