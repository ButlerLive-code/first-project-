// Ports for `npm run dev`. The site must run exactly at APP_URL: the API
// checks Origin against it and Better Auth puts it into email links, so Vite
// gets that port with --strictPort instead of quietly picking another one.
export function devPorts(env) {
  const appUrl = new URL(env.APP_URL || 'http://localhost:5173')
  return {
    web: appUrl.port || (appUrl.protocol === 'https:' ? '443' : '80'),
    api: env.API_PORT || '3001',
  }
}
