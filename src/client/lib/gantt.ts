import type { ProjectItem, ProjectFieldValue } from './github'
import type { Dependency } from './manual'

export type { Dependency }

export type GanttItem = {
  id: string
  title: string
  code: string
  start: Date
  end: Date
  status: string
  assignees: Array<{ login: string; avatarUrl: string }>
  progress: number
  issueNumber: number
  url: string
  labels: Array<{ name: string; color: string }>
  iteration: string | null
  milestone: { title: string; description: string; dueOn: string | null } | null
  description?: string
  dependencies?: Dependency[]
  parentId?: string | null
}

export const PROGRESS: Record<string, number> = {
  Done: 1,
  'In review': 0.85,
  'In progress': 0.55,
  'To do': 0,
  Backlog: 0,
}

const SIZE_DAYS: Record<string, number> = { XS: 3, S: 5, M: 10, L: 15, XL: 21 }

export const CODE_COLORS: Record<string, string> = {
  IS:    '#4988C4',
  UTU:   '#64CCC5',
  FS:    '#7B68EE',
  ASO:   '#F4A261',
  OTHER: '#7aa3c8',
}

export const STATUS_LIST = ['Backlog', 'To do', 'In progress', 'In review', 'Done'] as const

export function getCodeColor(code: string): string {
  return CODE_COLORS[code] ?? CODE_COLORS['OTHER']
}

function extractCode(title: string): string {
  const match = title.match(/^\[(\w+)-/)
  return match?.[1] ?? 'OTHER'
}

function getFieldValue(fvs: ProjectFieldValue[], fieldName: string): string | null {
  for (const fv of fvs) {
    if (!('field' in fv) || fv.field.name !== fieldName) continue
    if ('text' in fv) return fv.text
    if ('date' in fv) return fv.date
    if ('name' in fv) return fv.name
    if ('number' in fv) return String(fv.number)
  }
  return null
}

type IterationValue = { iterationId: string; title: string; startDate: string; duration: number }

function getIterationValue(fvs: ProjectFieldValue[]): IterationValue | null {
  for (const fv of fvs) {
    if ('startDate' in fv && 'duration' in fv) return fv as IterationValue
  }
  return null
}

function estimateDates(item: ProjectItem): { start: Date; end: Date } {
  const created = new Date(item.content.createdAt)
  const size = getFieldValue(item.fieldValues.nodes, 'Size') ?? 'M'
  const days = SIZE_DAYS[size] ?? 10
  const end = new Date(created)
  end.setDate(end.getDate() + days)
  return { start: created, end }
}

export function mapItemsToGantt(items: ProjectItem[]): GanttItem[] {
  return items
    .filter((item) => item.type === 'ISSUE' && item.content?.title)
    .map((item): GanttItem => {
      const fvs = item.fieldValues.nodes
      const iteration = getIterationValue(fvs)
      const startStr = getFieldValue(fvs, 'Start Date')
      const endStr = getFieldValue(fvs, 'End Date')
      const status = getFieldValue(fvs, 'Status') ?? 'Backlog'
      const closedAt = item.content.closedAt ? new Date(item.content.closedAt) : null

      let start: Date
      let end: Date
      if (iteration) {
        start = new Date(iteration.startDate)
        const iterEnd = new Date(iteration.startDate)
        iterEnd.setDate(iterEnd.getDate() + iteration.duration)
        end = closedAt ?? iterEnd
      } else if (startStr && endStr) {
        start = new Date(startStr)
        end = closedAt ?? new Date(endStr)
      } else {
        const est = estimateDates(item)
        start = est.start
        end = closedAt ?? est.end
      }

      return {
        id: item.id,
        title: item.content.title,
        code: extractCode(item.content.title),
        start,
        end,
        status,
        assignees: item.content.assignees.nodes,
        progress: PROGRESS[status] ?? 0,
        issueNumber: item.content.number,
        url: item.content.url,
        labels: item.content.labels.nodes,
        iteration: iteration?.title ?? null,
        milestone: item.content.milestone,
      }
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function getUniqueCodes(items: GanttItem[]): string[] {
  return [...new Set(items.map((i) => i.code))].sort()
}

export function getUniqueAssignees(items: GanttItem[]): string[] {
  return [...new Set(items.flatMap((i) => i.assignees.map((a) => a.login)))].sort()
}

export function getUniqueStatuses(items: GanttItem[]): string[] {
  return [...new Set(items.map((i) => i.status))].sort()
}

export function getUniqueIterations(items: GanttItem[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    if (item.iteration && !seen.has(item.iteration)) {
      seen.add(item.iteration)
      result.push(item.iteration)
    }
  }
  return result
}

export function getUniqueMilestones(items: GanttItem[]): string[] {
  return [
    ...new Set(
      items.map((i) => i.milestone?.title).filter((v): v is string => Boolean(v))
    ),
  ].sort()
}

export const MANUAL_PROGRESS: Record<string, number> = {
  todo:        0,
  in_progress: 0.55,
  done:        1,
}

export const MANUAL_STATUS_LABEL: Record<string, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
}

export function mapManualTaskToGantt(
  task: {
    id: string
    title: string
    description?: string
    status: string
    startDate: string | null
    endDate: string | null
    dependencies?: Dependency[]
    parentId?: string | null
  },
  index: number
): GanttItem {
  const now = new Date()
  const start = task.startDate ? new Date(task.startDate) : now
  const end = task.endDate ? new Date(task.endDate) : new Date(now.getTime() + 7 * 86400000)

  return {
    id: task.id,
    title: task.title,
    code: 'MAN',
    start,
    end,
    status: MANUAL_STATUS_LABEL[task.status] ?? task.status,
    assignees: [],
    progress: MANUAL_PROGRESS[task.status] ?? 0,
    issueNumber: index + 1,
    url: '',
    labels: [],
    iteration: null,
    milestone: null,
    description: task.description,
    dependencies: task.dependencies,
    parentId: task.parentId ?? null,
  }
}

/**
 * Compute the progress of a parent task from its direct children.
 * Returns the original progress if the task has no children in the list.
 */
export function computeTreeProgress(
  items: GanttItem[]
): GanttItem[] {
  const childrenMap = new Map<string, GanttItem[]>()
  for (const item of items) {
    const pid = item.parentId ?? null
    if (pid !== null) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, [])
      childrenMap.get(pid)!.push(item)
    }
  }

  return items.map((item) => {
    const children = childrenMap.get(item.id)
    if (!children || children.length === 0) return item
    const avgProgress = children.reduce((s, c) => s + c.progress, 0) / children.length
    return { ...item, progress: avgProgress }
  })
}

export function filterItems(
  items: GanttItem[],
  filters: {
    codes: string[]
    statuses: string[]
    assignees: string[]
    iterations: string[]
    milestones: string[]
  }
): GanttItem[] {
  return items.filter((item) => {
    if (filters.codes.length > 0 && !filters.codes.includes(item.code)) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false
    if (
      filters.assignees.length > 0 &&
      !item.assignees.some((a) => filters.assignees.includes(a.login))
    )
      return false
    if (
      filters.iterations.length > 0 &&
      (item.iteration === null || !filters.iterations.includes(item.iteration))
    )
      return false
    if (
      filters.milestones.length > 0 &&
      (!item.milestone?.title || !filters.milestones.includes(item.milestone.title))
    )
      return false
    return true
  })
}
