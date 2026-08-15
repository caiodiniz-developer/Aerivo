import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true, open: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0, // nada de inlinar textura/modelo em base64
    rollupOptions: {
      output: {
        // Three e GSAP em chunks próprios: o 3D só é pedido depois da hero,
        // então ele não pode pesar no bundle que abre a página.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'three'
          if (/[\\/]node_modules[\\/]gsap[\\/]/.test(id)) return 'gsap'
        },
      },
    },
  },
  assetsInclude: ['**/*.glb'],
})
