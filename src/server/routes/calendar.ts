import { CALENDAR_PRESETS } from '../lib/calendar'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleCalendar(req: Request): Promise<Response | null> {
  const url = new URL(req.url)

  if (req.method === 'GET' && url.pathname === '/api/calendar/presets') {
    return jsonResponse(CALENDAR_PRESETS)
  }

  return null
}
