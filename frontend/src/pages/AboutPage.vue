<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">About HomeTube</h1>

    <img src="/icon-512.png" alt="HomeTube Logo" class="w-32 h-32 mx-auto mb-6" />
    
    <div class="space-y-6">
      <section>
        <h2 class="text-2xl font-semibold mb-4">What is HomeTube?</h2>
        <p class="text-gray-300 leading-relaxed">
          HomeTube is a self-hosted media management application that allows you to download, organize, and enjoy your favorite videos and music from various online platforms. Built with modern web technologies, it provides a clean, intuitive interface for managing your personal media library.
        </p>
      </section>
      
      <section>
        <h2 class="text-2xl font-semibold mb-4">Key Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-800 p-4 rounded-lg">
            <h3 class="font-semibold mb-2">Video Management</h3>
            <ul class="list-disc list-inside text-gray-300 space-y-1">
              <li>Download videos from YouTube and other platforms</li>
              <li>Organize with channels and subscriptions</li>
              <li>Track watched/unwatched status</li>
              <li>Auto-delete watched videos after 7 days (optional)</li>
              <li>Quality selection for downloads</li>
            </ul>
          </div>
          
          <div class="bg-gray-800 p-4 rounded-lg">
            <h3 class="font-semibold mb-2">Music Library</h3>
            <ul class="list-disc list-inside text-gray-300 space-y-1">
              <li>Download audio in original format (mp3, webm, m4a, ogg, flac, wav)</li>
              <li>Create and manage playlists</li>
              <li>Virtual "My Songs" and "All Songs" views</li>
              <li>Import local music files</li>
              <li>Built-in audio player with controls</li>
            </ul>
          </div>
        </div>
      </section>
      
      <section>
        <h2 class="text-2xl font-semibold mb-4">How to Use</h2>
        <p class="text-gray-300 mb-4">HomeTube supports two modes of operation:</p>
        <div class="space-y-4">
          <div class="bg-gray-800 p-4 rounded-lg">
            <h3 class="font-semibold mb-2 text-blue-400">Server Mode</h3>
            <p class="text-gray-300 text-sm mb-2">Connect to the Python FastAPI backend for full functionality including downloading media, subscription checking, and multi-device access.</p>
            <ol class="list-decimal list-inside text-gray-300 space-y-1 text-sm">
              <li>Run the backend server: <code class="bg-gray-900 px-1 py-0.5">python main.py</code></li>
              <li>Point the frontend at your backend URL (e.g. <code class="bg-gray-900 px-1 py-0.5">http://localhost:8000/api</code>)</li>
              <li>Create a user and start adding media</li>
            </ol>
          </div>
          <div class="bg-gray-800 p-4 rounded-lg">
            <h3 class="font-semibold mb-2 text-green-400">Local Mode</h3>
            <p class="text-gray-300 text-sm mb-2">Runs entirely in the browser using IndexedDB — no server needed. Import an <code class="bg-gray-900 px-1 py-0.5">.ht</code> file to load your media library.</p>
            <ol class="list-decimal list-inside text-gray-300 space-y-1 text-sm">
              <li>On first launch, choose <strong>Local Mode</strong> on the setup page</li>
              <li>Import an <code class="bg-gray-900 px-1 py-0.5">.ht</code> file exported from another HomeTube instance</li>
              <li>Create a user and start browsing your media</li>
            </ol>
          </div>
        </div>
        <p class="text-gray-400 text-sm mt-4">
          You can switch between modes anytime in <strong>Settings</strong>. Export your data as an <code class="bg-gray-800 px-1 py-0.5">.ht</code> file to transfer between modes or instances.
        </p>
      </section>
      
      <section>
        <h2 class="text-2xl font-semibold mb-4">PWA Features</h2>
        <p class="text-gray-300 mb-4">
          HomeTube is a Progressive Web App (PWA), installable on desktop and mobile for a native-like experience:
        </p>
        <ul class="list-disc list-inside text-gray-300 space-y-2">
          <li>Installable on desktop and mobile devices</li>
          <li>Offline access to music via ServiceWorker caching</li>
          <li>Local mode uses IndexedDB for fully offline operation</li>
          <li>Wake Lock API for screen-off audio playback</li>
          <li>Web Downloads API to save media files to device</li>
          <li>Responsive design for all screen sizes</li>
        </ul>
      </section>
      
<div class="text-center mt-8">
  <a href="/setup" class="bg-d30f0f hover:bg-b30c0c text-white font-bold py-3 px-6 rounded-lg transition-colors">
    Get Started
  </a>
</div>
    </div>
  </div>
</template>

<script setup>
// No script logic needed for this static about page
</script>

<style scoped>
/* Any specific styling for the about page can go here */
</style>