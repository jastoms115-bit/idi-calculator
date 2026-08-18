import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'favicon-16.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Thomarg Technologies — IDI Calculator',
        short_name: 'IDI Calculator',
        description: 'Engineering calculations, simplified — by Thomarg Technologies',
        theme_color: '#0B1F2B',
        background_color: '#14181e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
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
