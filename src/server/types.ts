export type Session = {
  token: string
  login: string
  avatarUrl: string
  name: string
  expiresAt: number
}

export type SessionStore = Map<string, Session>

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

export type Dependency = {
  taskId: string
  type: DependencyType
  lag: number
}

export type CalendarConfig = {
  country: string | null
  customDays: string[]                              // ISO dates YYYY-MM-DD, one-off
  recurringDays: Array<{ month: number; day: number }>  // annual recurrence (1-indexed)
  weekendDays: number[]                             // 0=Sun … 6=Sat
}

export const DEFAULT_CALENDAR: CalendarConfig = {
  country: null,
  customDays: [],
  recurringDays: [],
  weekendDays: [0, 6],
}

export type ManualTask = {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  dependencies: Dependency[]
  parentId: string | null
  startDate: string | null
  endDate: string | null
  createdAt: number
  updatedAt: number
}

export type ManualProject = {
  id: string
  title: string
  tasks: ManualTask[]
  sessionId: string
  shareId: string | null
  calendar: CalendarConfig
  createdAt: number
  updatedAt: number
}
