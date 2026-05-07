<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-center">About HomeTube</h1>
    
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
        <ol class="list-decimal list-inside text-gray-300 space-y-2">
          <li class="mb-2">
            <strong>Set up your backend:</strong> Run the HomeTube backend server on your local machine or server.
          </li>
          <li class="mb-2">
            <strong>Configure the frontend:</strong> Set your backend URL below (e.g., http://localhost:8000).
          </li>
          <li class="mb-2">
            <strong>Create a user:</strong> Add your username to personalize your experience.
          </li>
          <li class="mb-2">
            <strong>Start adding media:</strong> Use the "Add Video" or "Add Music" pages to download content by URL.
          </li>
          <li class="mb-2">
            <strong>Enjoy your library:</strong> Browse your downloaded videos and music through the intuitive interface.
          </li>
        </ol>
      </section>
      
      <section>
        <h2 class="text-2xl font-semibold mb-4">PWA Features</h2>
        <p class="text-gray-300 mb-4">
          HomeTube is a Progressive Web App (PWA), which means you can install it on your device for a native-like experience:
        </p>
        <ul class="list-disc list-inside text-gray-300 space-y-2">
          <li>Installable on desktop and mobile devices</li>
          <li>Offline capabilities for previously accessed content</li>
          <li>Background synchronization</li>
          <li>Push notifications (when supported)</li>
          <li>Responsive design for all screen sizes</li>
        </ul>
      </section>
      
      <div class="text-center mt-8">
        <a href="/user" class="bg-d30f0f hover:bg-b30c0c text-white font-bold py-3 px-6 rounded-lg transition-colors">
          Get Started → Configure Backend & Create User
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