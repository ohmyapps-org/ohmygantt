import type { ManualProject, ManualTask, CalendarConfig, Dependency } from '../types'
import { DEFAULT_CALENDAR } from '../types'
import { getPreset } from './calendar'

const projects = new Map<string, ManualProject>()
const shareIndex = new Map<string, string>()

export function createProject(title: string, sessionId: string): ManualProject {
  const now = Date.now()
  const project: ManualProject = {
    id: crypto.randomUUID(),
    title,
    tasks: [],
    sessionId,
    shareId: null,
    calendar: { ...DEFAULT_CALENDAR },
    createdAt: now,
    updatedAt: now,
  }
  projects.set(project.id, project)
  return project
}

export function getProject(id: string): ManualProject | undefined {
  return projects.get(id)
}

export function updateProject(
  id: string,
  data: { title?: string; tasks?: ManualTask[] }
): ManualProject | undefined {
  const project = projects.get(id)
  if (!project) return undefined
  if (data.title !== undefined) project.title = data.title
  if (data.tasks !== undefined) project.tasks = data.tasks
  project.updatedAt = Date.now()
  return project
}

export function updateCalendar(
  id: string,
  calendar: Partial<CalendarConfig>
): ManualProject | undefined {
  const project = projects.get(id)
  if (!project) return undefined

  // If country changed, load preset holidays into weekendDays
  if (calendar.country !== undefined) {
    if (calendar.country === null) {
      project.calendar = {
        ...project.calendar,
        country: null,
        weekendDays: DEFAULT_CALENDAR.weekendDays,
        ...calendar,
      }
    } else {
      const preset = getPreset(calendar.country)
      project.calendar = {
        ...project.calendar,
        country: calendar.country,
        weekendDays: preset?.weekendDays ?? DEFAULT_CALENDAR.weekendDays,
        ...calendar,
      }
    }
  } else {
    project.calendar = { ...project.calendar, ...calendar }
  }

  project.updatedAt = Date.now()
  return project
}

export function deleteProject(id: string): boolean {
  const project = projects.get(id)
  if (project?.shareId) shareIndex.delete(project.shareId)
  return projects.delete(id)
}

export function listProjects(sessionId: string): ManualProject[] {
  return Array.from(projects.values()).filter((p) => p.sessionId === sessionId)
}

export function generateShareId(projectId: string): string | undefined {
  const project = projects.get(projectId)
  if (!project) return undefined
  const shareId = crypto.randomUUID().slice(0, 12)
  project.shareId = shareId
  project.updatedAt = Date.now()
  shareIndex.set(shareId, projectId)
  return shareId
}

export function revokeShare(projectId: string): boolean {
  const project = projects.get(projectId)
  if (!project || !project.shareId) return false
  shareIndex.delete(project.shareId)
  project.shareId = null
  project.updatedAt = Date.now()
  return true
}

export function getProjectByShareId(shareId: string): ManualProject | undefined {
  const projectId = shareIndex.get(shareId)
  if (!projectId) return undefined
  return projects.get(projectId)
}

// --- Validation ---

/** Returns true if the dependency graph (taskId → dep.taskId edges) has a cycle. */
export function hasDependencyCycle(tasks: ManualTask[]): boolean {
  const adj = new Map<string, string[]>()
  for (const task of tasks) {
    adj.set(task.id, (task.dependencies ?? []).map((d: Dependency) => d.taskId))
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(id: string): boolean {
    if (inStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    inStack.add(id)
    for (const neighbor of adj.get(id) ?? []) {
      if (dfs(neighbor)) return true
    }
    inStack.delete(id)
    return false
  }

  for (const task of tasks) {
    if (!visited.has(task.id) && dfs(task.id)) return true
  }
  return false
}

/** Returns true if the parent-child hierarchy has a cycle. */
export function hasParentCycle(tasks: ManualTask[]): boolean {
  const parentMap = new Map<string, string>()
  const idSet = new Set<string>(tasks.map((t) => t.id))

  for (const task of tasks) {
    if (task.parentId && idSet.has(task.parentId)) {
      parentMap.set(task.id, task.parentId)
    }
  }

  for (const task of tasks) {
    if (!task.parentId) continue
    const seen = new Set<string>()
    let cur: string | undefined = task.id
    while (cur !== undefined) {
      if (seen.has(cur)) return true
      seen.add(cur)
      cur = parentMap.get(cur)
    }
  }
  return false
}

// --- Session helpers ---

const MANUAL_COOKIE = 'manual_session'

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k.trim(), decodeURIComponent(v.join('='))]
    })
  )
}

export function getManualSessionId(req: Request): string | null {
  const cookies = parseCookies(req.headers.get('cookie'))
  return cookies[MANUAL_COOKIE] ?? null
}

export function ensureManualSession(req: Request): { sessionId: string; cookie?: string } {
  const existing = getManualSessionId(req)
  if (existing) return { sessionId: existing }

  const id = crypto.randomUUID()
  const cookie = `${MANUAL_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${604800}`
  return { sessionId: id, cookie }
}

// Periodic cleanup of old projects (older than 7 days)
setInterval(() => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  for (const [id, project] of projects) {
    if (project.createdAt < cutoff) {
      if (project.shareId) shareIndex.delete(project.shareId)
      projects.delete(id)
    }
  }
}, 300_000)
