import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'HomeTube',
        short_name: 'HomeTube',
        theme_color: '#d30f0f',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-64.png', sizes: '64x64', type: 'image/png' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      }
    })
  ],
  base: '/',
  build: { 
    outDir: 'docs',
    assetsDir: 'assets'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    },
    historyApiFallback: true
  }
})
