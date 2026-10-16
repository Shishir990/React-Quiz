import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Client-side pages. Each gets its own copy of index.html in the build so a
// refresh or direct link (e.g. /dashboard) finds a real file on the host
// instead of a 404. Keep in sync with the <Route> paths in src/App.jsx.
const SPA_ROUTES = ['login', 'register', 'dashboard', 'results', 'leaderboard', 'error', 'quiz', 'finish', 'admin', 'admin/questions', 'admin/categories', 'admin/users']

const spaRouteCopies = () => ({
  name: 'spa-route-copies',
  apply: 'build',
  closeBundle() {
    const dist = fileURLToPath(new URL('./dist', import.meta.url))
    const index = join(dist, 'index.html')
    for (const route of SPA_ROUTES) {
      mkdirSync(join(dist, route), { recursive: true })
      copyFileSync(index, join(dist, route, 'index.html'))
    }
    // Fallback page for any other unknown path
    copyFileSync(index, join(dist, '404.html'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaRouteCopies()],
  server: {
    // In development, forward /api to the local Express server
    // (in production Vercel routes /api to the backend service)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
