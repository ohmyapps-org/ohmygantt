import {
  createProject,
  getProject,
  updateProject,
  updateCalendar,
  deleteProject,
  listProjects,
  generateShareId,
  revokeShare,
  getProjectByShareId,
  ensureManualSession,
  getManualSessionId,
  hasDependencyCycle,
  hasParentCycle,
} from '../lib/manual'
import type { ManualTask, CalendarConfig } from '../types'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleManual(req: Request): Promise<Response | null> {
  const url = new URL(req.url)
  const method = req.method

  // POST /api/manual — create project
  if (method === 'POST' && url.pathname === '/api/manual') {
    const { sessionId, cookie } = ensureManualSession(req)
    let title = 'Untitled Project'
    try {
      const body = (await req.json()) as { title?: string }
      if (body.title) title = body.title
    } catch {}
    const project = createProject(title, sessionId)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cookie) headers['Set-Cookie'] = cookie
    return new Response(JSON.stringify(project), { status: 201, headers })
  }

  // GET /api/manual — list projects
  if (method === 'GET' && url.pathname === '/api/manual') {
    const sessionId = getManualSessionId(req)
    if (!sessionId) return jsonResponse([])
    const result = listProjects(sessionId).map((p) => ({
      id: p.id,
      title: p.title,
      taskCount: p.tasks.length,
      shareId: p.shareId,
      updatedAt: p.updatedAt,
    }))
    return jsonResponse(result)
  }

  // GET /api/manual/shared/:shareId
  const sharedMatch = url.pathname.match(/^\/api\/manual\/shared\/([a-zA-Z0-9-]+)$/)
  if (sharedMatch && method === 'GET') {
    const shareId = sharedMatch[1]
    const project = getProjectByShareId(shareId)
    if (!project) return jsonResponse({ error: 'Not found' }, 404)
    return jsonResponse({
      id: project.id,
      title: project.title,
      tasks: project.tasks,
      calendar: project.calendar,
    })
  }

  // /api/manual/:id
  const projectMatch = url.pathname.match(/^\/api\/manual\/([a-f0-9-]+)$/)
  if (projectMatch) {
    const id = projectMatch[1]
    const sessionId = getManualSessionId(req)
    const project = getProject(id)

    if (method === 'GET') {
      if (!project) return jsonResponse({ error: 'Not found' }, 404)
      if (project.sessionId !== sessionId) return jsonResponse({ error: 'Forbidden' }, 403)
      return jsonResponse(project)
    }

    if (method === 'PUT') {
      if (!project) return jsonResponse({ error: 'Not found' }, 404)
      if (project.sessionId !== sessionId) return jsonResponse({ error: 'Forbidden' }, 403)
      try {
        const body = (await req.json()) as { title?: string; tasks?: ManualTask[] }

        if (body.tasks) {
          // Validate no circular dependency
          if (hasDependencyCycle(body.tasks)) {
            return jsonResponse({ error: 'Circular dependency detected' }, 400)
          }
          // Validate no circular parent-child
          if (hasParentCycle(body.tasks)) {
            return jsonResponse({ error: 'Circular parent-child relationship detected' }, 400)
          }
          // Validate all dependency taskIds exist
          const taskIds = new Set(body.tasks.map((t) => t.id))
          for (const task of body.tasks) {
            for (const dep of task.dependencies ?? []) {
              if (!taskIds.has(dep.taskId)) {
                return jsonResponse({ error: `Dependency references unknown task: ${dep.taskId}` }, 400)
              }
            }
            if (task.parentId && !taskIds.has(task.parentId)) {
              return jsonResponse({ error: `Parent references unknown task: ${task.parentId}` }, 400)
            }
          }
        }

        const updated = updateProject(id, body)
        return jsonResponse(updated)
      } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400)
      }
    }

    if (method === 'DELETE') {
      if (!project) return jsonResponse({ error: 'Not found' }, 404)
      if (project.sessionId !== sessionId) return jsonResponse({ error: 'Forbidden' }, 403)
      deleteProject(id)
      return jsonResponse({ ok: true })
    }
  }

  // POST /api/manual/:id/calendar
  const calendarMatch = url.pathname.match(/^\/api\/manual\/([a-f0-9-]+)\/calendar$/)
  if (calendarMatch && method === 'POST') {
    const id = calendarMatch[1]
    const sessionId = getManualSessionId(req)
    const project = getProject(id)
    if (!project) return jsonResponse({ error: 'Not found' }, 404)
    if (project.sessionId !== sessionId) return jsonResponse({ error: 'Forbidden' }, 403)
    try {
      const body = (await req.json()) as Partial<CalendarConfig>
      const updated = updateCalendar(id, body)
      return jsonResponse(updated)
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400)
    }
  }

  // POST /api/manual/:id/share
  const shareMatch = url.pathname.match(/^\/api\/manual\/([a-f0-9-]+)\/share$/)
  if (shareMatch && method === 'POST') {
    const id = shareMatch[1]
    const sessionId = getManualSessionId(req)
    const project = getProject(id)
    if (!project) return jsonResponse({ error: 'Not found' }, 404)
    if (project.sessionId !== sessionId) return jsonResponse({ error: 'Forbidden' }, 403)
    const shareId = generateShareId(id)
    return jsonResponse({ shareId })
  }

  if (shareMatch && method === 'DELETE') {
    const id = shareMatch[1]
    const sessionId = getManualSessionId(req)
    const project = getProject(id)
    if (!project) return jsonResponse({ error: 'Not found' }, 404)
    if (project.sessionId !== sessionId) return jsonResponse({ error: 'Forbidden' }, 403)
    revokeShare(id)
    return jsonResponse({ ok: true })
  }

  return null
}
