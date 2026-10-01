import { adminClient, inferAdditionalFields, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Better Auth in the browser. All calls go to /api/auth on the site's own
// origin (Vite proxies /api to the API server in development).
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [
    inferAdditionalFields({ user: { locale: { type: 'string', required: false } } }),
    twoFactorClient(),
    adminClient(),
  ],
})
