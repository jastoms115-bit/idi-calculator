import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Ijimari Degradation Index',
        short_name: 'IDI',
        description: 'Intelligent Condition Monitoring for Rotating Equipment',
        theme_color: '#1a1f26',
        background_color: '#1a1f26',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // App shell + static assets cached for offline load.
        // Firestore's own offline persistence (see src/firebase/config.js)
        // handles data; this only guarantees the UI itself boots offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ]
})
