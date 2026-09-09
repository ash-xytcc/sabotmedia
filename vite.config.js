import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        archive: resolve(process.cwd(), 'archive.html'),
      },
    },
  },
  server: {
    port: 4173,
    host: true,
  },
})
