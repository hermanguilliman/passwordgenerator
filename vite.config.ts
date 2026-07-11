import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'


export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.webp', 'masked-icon.svg'],
      manifest: {
        name: 'Guilliman Password Generator',
        short_name: 'PassGen',
        description: 'Cyberpunk Password Generator',
        theme_color: '#9ef523',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.webp', 
            sizes: '192x192',
            type: 'image/webp'
          },
          {
            src: 'pwa-512x512.webp',
            sizes: '512x512',
            type: 'image/webp'
          }
        ]
      }
    })
  ],
})