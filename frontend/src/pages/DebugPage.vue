<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getProvider } from '../api.js'
import { useErrorStore } from '../stores/errors.js'

const router = useRouter()
const errorStore = useErrorStore()

const tab = ref('metadata')
const metadata = ref(null)
const loading = ref(true)
const error = ref(null)
const validation = ref(null)
const validating = ref(false)

const errorTypeClass = {
  vue: 'text-yellow-400',
  js: 'text-red-400',
  promise: 'text-orange-400',
  unknown: 'text-gray-400'
}

async function fetchMetadata() {
  loading.value = true
  error.value = null
  try {
    metadata.value = await getProvider().getMetadata()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString()
}

async function runValidation() {
  validating.value = true
  validation.value = null
  try {
    const data = await getProvider().getMetadata()
    const issues = []

    const userIds = new Set((data.users || []).map(u => u.id))
    const channelIds = new Set((data.channels || []).map(c => c.id))
    const musicIds = new Set((data.music || []).map(m => m.id))

    for (const s of (data.subscriptions || [])) {
      if (!channelIds.has(s.channel_id))
        issues.push({ check: 'Subscription points to missing channel', severity: 'error', item: s, detail: `sub #${s.id} → channel #${s.channel_id}`, fix: { type: 'delete', path: `/subscriptions/${s.id}` } })
      if (!userIds.has(s.user_id))
        issues.push({ check: 'Subscription points to missing user', severity: 'error', item: s, detail: `sub #${s.id} → user #${s.user_id}`, fix: { type: 'delete', path: `/subscriptions/${s.id}` } })
    }

    for (const v of (data.videos || [])) {
      if (!channelIds.has(v.channel_id))
        issues.push({ check: 'Video references missing channel', severity: 'error', item: v, detail: `video #${v.id} "${v.title}" → channel #${v.channel_id}`, fix: { type: 'reassign', path: `/videos/${v.id}`, bodyKey: 'channel_id', options: 'channels', deletePath: `/videos/${v.id}` } })
      if (!userIds.has(v.added_by))
        issues.push({ check: 'Video references missing user', severity: 'error', item: v, detail: `video #${v.id} "${v.title}" → user #${v.added_by}`, fix: { type: 'reassign', path: `/videos/${v.id}`, bodyKey: 'added_by', options: 'users', deletePath: `/videos/${v.id}` } })
    }

    for (const m of (data.music || [])) {
      if (!userIds.has(m.added_by))
        issues.push({ check: 'Music references missing user', severity: 'error', item: m, detail: `music #${m.id} "${m.title}" → user #${m.added_by}`, fix: { type: 'reassign', path: `/music/${m.id}`, bodyKey: 'added_by', options: 'users', deletePath: `/music/${m.id}` } })
    }

    for (const p of (data.playlists || [])) {
      if (!userIds.has(p.user_id))
        issues.push({ check: 'Playlist references missing user', severity: 'error', item: p, detail: `playlist #${p.id} "${p.name}" → user #${p.user_id}`, fix: { type: 'reassign', path: `/playlists/${p.id}`, bodyKey: 'user_id', options: 'users', deletePath: `/playlists/${p.id}` } })
      for (const song of (p.songs || [])) {
        const mid = song.music_id ?? song
        if (!musicIds.has(mid))
          issues.push({ check: 'Playlist song references missing music', severity: 'warning', item: p, detail: `playlist #${p.id} "${p.name}" → music #${mid}`, fix: { type: 'remove_song', path: `/playlists/${p.id}/remove/${mid}` } })
      }
    }

    const seenMusicVideoIds = new Map()
    for (const m of (data.music || [])) {
      if (m.video_id && seenMusicVideoIds.has(m.video_id))
        issues.push({ check: 'Duplicate video_id across music entries', severity: 'info', item: m, detail: `music #${m.id} "${m.title}" duplicates video_id ${m.video_id} (also music #${seenMusicVideoIds.get(m.video_id)})`, fix: { type: 'delete', path: `/music/${m.id}` } })
      if (m.video_id) seenMusicVideoIds.set(m.video_id, m.id)
    }

    const grouped = {}
    for (const issue of issues) {
      if (!grouped[issue.check]) grouped[issue.check] = []
      grouped[issue.check].push(issue)
    }

    validation.value = {
      total: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      users: data.users || [],
      channels: data.channels || [],
      checks: Object.entries(grouped).map(([name, items]) => ({
        name,
        severity: items.some(i => i.severity === 'error') ? 'error' : items.some(i => i.severity === 'warning') ? 'warning' : 'info',
        count: items.length,
        items
      }))
    }
  } catch (e) {
    validation.value = { error: e.message }
  } finally {
    validating.value = false
  }
}

const fixingIssue = ref(null)
const fixValue = ref(null)
const fixError = ref(null)

async function handleFix(issue) {
  if (!issue.fix) return
  fixingIssue.value = null
  fixError.value = null
  try {
    const provider = getProvider()
    const fix = issue.fix
    if (fix.type === 'delete' || fix.type === 'remove_song') {
      await provider.delete(fix.path)
    } else if (fix.type === 'reassign') {
      if (fixValue.value === null) return
      await provider.put(fix.path, { [fix.bodyKey]: fixValue.value })
    }
    fixValue.value = null
    await runValidation()
  } catch (e) {
    fixError.value = e.message
  }
}

async function handleDeleteOnly(path) {
  fixError.value = null
  try {
    await getProvider().delete(path)
    await runValidation()
  } catch (e) {
    fixError.value = e.message
  }
}

function openReassign(issue) {
  fixingIssue.value = issue.detail
  fixValue.value = null
}

function cancelReassign() {
  fixingIssue.value = null
  fixValue.value = null
}

onMounted(fetchMetadata)
</script>

<template>
  <div class="p-4 pt-16">
    <div class="flex items-center gap-3 mb-4">
      <button @click="router.back()" class="text-gray-400">
        <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
      </button>
      <h2 class="text-xl font-bold">Debug View</h2>
    </div>

    <div class="flex gap-2 mb-4">
      <button @click="tab = 'metadata'"
        :class="tab === 'metadata' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
        class="px-3 py-1.5 rounded text-sm">Database</button>
      <button @click="tab = 'errors'; errorStore.markAllRead()"
        :class="tab === 'errors' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
        class="px-3 py-1.5 rounded text-sm relative">
        Error Log
        <span v-if="errorStore.unreadCount" class="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{{ errorStore.unreadCount }}</span>
      </button>
      <button @click="tab = 'validation'; runValidation()"
        :class="tab === 'validation' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'"
        class="px-3 py-1.5 rounded text-sm">Validation</button>
      <button @click="errorStore.clearEvents()" v-if="errorStore.count"
        class="px-3 py-1.5 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 ml-auto">
        <FontAwesomeIcon :icon="['fas', 'trash']" class="mr-1" />Clear
      </button>
    </div>

    <div v-if="tab === 'metadata'">
      <div v-if="loading" class="text-gray-400 text-center py-8">Loading database metadata...</div>

      <div v-else-if="error" class="text-red-400 text-center py-8">
        Error loading metadata: {{ error }}
      </div>

      <div v-else class="bg-gray-900 rounded-lg overflow-hidden">
        <div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            {{ metadata.exported_at }} &middot;
            {{ metadata.users?.length || 0 }} users,
            {{ metadata.channels?.length || 0 }} channels,
            {{ metadata.subscriptions?.length || 0 }} subs,
            {{ metadata.videos?.length || 0 }} videos,
            {{ metadata.music?.length || 0 }} music,
            {{ metadata.playlists?.length || 0 }} playlists,
            {{ metadata.settings?.length || 0 }} settings
          </span>
          <button @click="fetchMetadata"
            class="text-xs text-blue-400 hover:text-blue-300">
            <FontAwesomeIcon :icon="['fas', 'rotate']" class="mr-1" />Refresh
          </button>
        </div>
        <pre class="p-4 text-xs text-green-400 overflow-auto max-h-[70vh] font-mono">{{ JSON.stringify(metadata, null, 2) }}</pre>
      </div>
    </div>

    <div v-else-if="tab === 'errors'">
      <div v-if="errorStore.count === 0" class="text-gray-400 text-center py-8">No errors recorded.</div>

      <div v-else class="space-y-2 max-h-[75vh] overflow-y-auto">
        <div v-for="ev in errorStore.events" :key="ev.id"
          class="bg-gray-900 rounded-lg p-3 text-xs font-mono">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-gray-500">{{ formatTime(ev.timestamp) }}</span>
            <span :class="errorTypeClass[ev.type] || 'text-gray-400'" class="font-bold uppercase">{{ ev.type }}</span>
            <span v-if="ev.component" class="text-gray-500">[{{ ev.component }}]</span>
          </div>
          <div class="text-gray-200 break-words">{{ ev.message }}</div>
          <div v-if="ev.stack" class="text-gray-500 mt-1 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{{ ev.stack }}</div>
        </div>
      </div>
    </div>

    <div v-else-if="tab === 'validation'">
      <div v-if="validating" class="text-gray-400 text-center py-8">Running validation...</div>

      <template v-else-if="validation">
        <div v-if="validation.error" class="text-red-400 text-center py-8">
          Validation error: {{ validation.error }}
        </div>

        <div v-else>
          <div class="flex items-center gap-3 mb-3 text-sm">
            <span class="text-gray-400">
              <span class="text-green-400 font-bold">{{ validation.total - validation.errors - validation.warnings - validation.info }}</span> passed,
              <span v-if="validation.errors" class="text-red-400 font-bold">{{ validation.errors }}</span><span v-if="validation.errors"> error</span><span v-if="validation.errors > 1">s</span><span v-if="validation.errors">,</span>
              <span v-if="validation.warnings" class="text-yellow-400 font-bold">{{ validation.warnings }}</span><span v-if="validation.warnings"> warning</span><span v-if="validation.warnings > 1">s</span><span v-if="validation.warnings || validation.errors">,</span>
              <span v-if="validation.info" class="text-blue-400 font-bold">{{ validation.info }}</span><span v-if="validation.info"> info</span>
            </span>
            <button @click="runValidation"
              class="text-xs text-blue-400 hover:text-blue-300 ml-auto">
              <FontAwesomeIcon :icon="['fas', 'rotate']" class="mr-1" />Re-run
            </button>
          </div>

          <div v-if="validation.total === 0" class="text-green-400 text-center py-8">
            <FontAwesomeIcon :icon="['fas', 'check-circle']" class="mr-1" />All checks passed — no issues found.
          </div>

          <div v-if="fixError" class="text-red-400 text-xs mb-2 bg-red-900/30 rounded p-2">{{ fixError }}</div>

          <div v-else class="space-y-3 max-h-[75vh] overflow-y-auto">
            <div v-for="check in validation.checks" :key="check.name"
              class="bg-gray-900 rounded-lg p-3 text-xs font-mono">
              <div class="flex items-center gap-2 mb-1">
                <FontAwesomeIcon v-if="check.severity === 'error'" :icon="['fas', 'times-circle']" class="text-red-400" />
                <FontAwesomeIcon v-else-if="check.severity === 'warning'" :icon="['fas', 'exclamation-triangle']" class="text-yellow-400" />
                <FontAwesomeIcon v-else :icon="['fas', 'info-circle']" class="text-blue-400" />
                <span class="text-gray-200 font-bold">{{ check.name }}</span>
                <span class="text-gray-500">({{ check.count }})</span>
              </div>
              <div v-for="issue in check.items" :key="issue.detail" class="mb-1">
                <div class="pl-5 text-gray-400 leading-relaxed flex items-start gap-2">
                  <span class="flex-1 min-w-0 truncate">{{ issue.detail }}</span>
                  <span class="flex-shrink-0 flex items-center gap-1">
                    <button v-if="issue.fix?.type === 'delete'" @click="handleDeleteOnly(issue.fix.path)"
                      class="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1.5 py-0.5 rounded">
                      <FontAwesomeIcon :icon="['fas', 'trash']" class="mr-0.5" />Delete
                    </button>
                    <button v-if="issue.fix?.type === 'remove_song'" @click="handleFix(issue)"
                      class="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                      <FontAwesomeIcon :icon="['fas', 'times']" class="mr-0.5" />Remove
                    </button>
                    <template v-if="issue.fix?.type === 'reassign'">
                      <button v-if="fixingIssue !== issue.detail" @click="openReassign(issue)"
                        class="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 px-1.5 py-0.5 rounded">
                        <FontAwesomeIcon :icon="['fas', 'user-edit']" class="mr-0.5" />Reassign
                      </button>
                      <button @click="handleDeleteOnly(issue.fix.deletePath)"
                        class="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-1.5 py-0.5 rounded">
                        <FontAwesomeIcon :icon="['fas', 'trash']" class="mr-0.5" />Delete
                      </button>
                    </template>
                  </span>
                </div>
                <div v-if="fixingIssue === issue.detail && issue.fix?.type === 'reassign'"
                  class="pl-5 pt-1 pb-1 flex items-center gap-2">
                  <select v-model="fixValue"
                    class="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700 max-w-40">
                    <option :value="null" disabled>Select {{ issue.fix.options === 'users' ? 'user' : 'channel' }}...</option>
                    <option v-for="opt in (issue.fix.options === 'users' ? validation.users : validation.channels)" :key="opt.id" :value="opt.id">
                      {{ opt.name || opt.username || `#${opt.id}` }}
                    </option>
                  </select>
                  <button @click="handleFix(issue)" :disabled="fixValue === null"
                    class="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs px-2 py-1 rounded">
                    Confirm
                  </button>
                  <button @click="cancelReassign"
                    class="text-gray-400 hover:text-gray-300 text-xs px-2 py-1">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
