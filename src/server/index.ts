import { handleAuth } from './routes/auth'
import { handleGitHub } from './routes/github'
import { handleManual } from './routes/manual'
import { handleShare } from './routes/share'
import { handleTrello } from './routes/trello'
import { handleCalendar } from './routes/calendar'

const REQUIRED_ENV = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'] as const
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[server] Missing required env var: ${key}. Copy .env.example → .env and fill it in.`)
  }
}

const PORT = Number(process.env.PORT ?? 3000)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const APP_URL = process.env.VITE_APP_URL ?? 'http://localhost:5173'
const ALLOWED_ORIGIN = IS_PRODUCTION ? APP_URL : 'http://localhost:5173'

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://avatars.githubusercontent.com https://github.com",
    "connect-src 'self'",
  ].join('; '),
}

function addCors(res: Response, origin: string | null): Response {
  if (origin !== ALLOWED_ORIGIN) return res
  const headers = new Headers(res.headers)
  headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

function addSecurity(res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const origin = req.headers.get('origin')

    if (req.method === 'OPTIONS') {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 204 })
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      })
    }

    const authRes = await handleAuth(req)
    if (authRes) return addCors(addSecurity(authRes), origin)

    const githubRes = await handleGitHub(req)
    if (githubRes) return addCors(addSecurity(githubRes), origin)

    const manualRes = await handleManual(req)
    if (manualRes) return addCors(addSecurity(manualRes), origin)

    const shareRes = await handleShare(req)
    if (shareRes) return addCors(addSecurity(shareRes), origin)

    const trelloRes = await handleTrello(req)
    if (trelloRes) return addCors(addSecurity(trelloRes), origin)

    const calendarRes = await handleCalendar(req)
    if (calendarRes) return addCors(addSecurity(calendarRes), origin)

    if (IS_PRODUCTION) {
      const url = new URL(req.url)
      const filePath = `./dist${url.pathname === '/' ? '/index.html' : url.pathname}`
      const file = Bun.file(filePath)
      if (await file.exists()) return new Response(file)
      return new Response(Bun.file('./dist/index.html'))
    }

    return new Response('Not found', { status: 404 })
  },
})

console.log(`Server running on http://localhost:${PORT}`)

const shutdown = () => { server.stop(true); process.exit(0) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
