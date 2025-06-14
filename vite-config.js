import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/locations': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})