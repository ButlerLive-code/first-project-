import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API (server/index.ts) listens on API_PORT; the browser only ever talks
// to Vite, so cookies and Origin are those of the site itself.
const apiPort = process.env.API_PORT ?? '3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // xfwd adds X-Forwarded-For, so rate limiting sees the real client IP.
      '/api': { target: `http://127.0.0.1:${apiPort}`, xfwd: true },
    },
  },
  build: {
    outDir: 'build',
  },
})
