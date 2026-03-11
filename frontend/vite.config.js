import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/post': 'http://localhost:3000'
    }
  }
})
