import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      // Dev only: send /auth and /me calls to the backend, so the browser sees
      // one origin (no CORS) and the refresh cookie (path /auth) works.
      // The keys are patterns that match only /auth, /auth/..., /me and /me/...;
      // a plain '/me' would also send app pages like /members to the backend.
      proxy: {
        '^/auth(/|$)': env.VITE_API_URL || 'http://localhost:3000',
        '^/me(/|$)': env.VITE_API_URL || 'http://localhost:3000',
        // AGL-08.5: /admin/users is both an app page and the API. A browser
        // opening the page asks for HTML, so it gets the app; API calls go to
        // the backend. Removed when the API moves under /api/v1 (AGL-08.8).
        '^/admin(/|$)': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          bypass: (req) =>
            req.headers.accept?.includes('text/html') ? '/index.html' : undefined,
        },
      },
    },
  }
})
