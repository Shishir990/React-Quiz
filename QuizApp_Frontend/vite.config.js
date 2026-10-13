import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, forward /api to the local Express server
    // (in production Vercel routes /api to the backend service)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
