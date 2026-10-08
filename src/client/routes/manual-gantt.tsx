import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { getManualProject, updateProjectCalendar } from '@/lib/manual'
import type { ManualProject, CalendarConfig } from '@/lib/manual'
import { mapManualTaskToGantt, filterItems, getUniqueStatuses, computeTreeProgress } from '@/lib/gantt'
import type { ItemFilters } from '@/hooks/useItems'
import GanttChart from '@/components/gantt/GanttChart'
import ProjectSettings from '@/components/gantt/ProjectSettings'
import { Button } from '@/components/ui/button'

export default function ManualGanttRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ManualProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ItemFilters>({
    codes: [],
    statuses: [],
    assignees: [],
    iterations: [],
    milestones: [],
  })

  useEffect(() => {
    getManualProject(projectId)
      .then(setProject)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [projectId, navigate])

  const handleCalendarChange = useCallback(
    async (patch: Partial<CalendarConfig>) => {
      if (!project) return
      const updated = await updateProjectCalendar(project.id, patch)
      setProject(updated)
    },
    [project]
  )

  // Map all tasks to GanttItems (including parentId)
  const allItems = useMemo(() => {
    if (!project) return []
    const mapped = project.tasks.map((t, i) => mapManualTaskToGantt(t, i))
    return computeTreeProgress(mapped)
  }, [project])

  const items = useMemo(() => filterItems(allItems, filters), [allItems, filters])
  const availableStatuses = useMemo(() => getUniqueStatuses(allItems), [allItems])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07172e]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4988C4] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#07172e] text-[#e8f4fd]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e3a5f] bg-[#07172e] px-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8 text-[#7aa3c8]"
          >
            <ArrowLeft size={16} />
          </Button>
          <Link to="/" className="flex items-center gap-2 text-[#e8f4fd] hover:text-white">
            <span className="font-semibold text-sm tracking-wide">Gantt</span>
          </Link>
          <span className="text-[#1e3a5f]">/</span>
          <div>
            <h1 className="text-sm font-semibold text-[#e8f4fd]">
              {project?.title ?? 'Manual Project'}
            </h1>
            <p className="text-xs text-[#7aa3c8]">
              {items.length} of {allItems.length} items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project && (
            <ProjectSettings
              projectId={project.id}
              calendar={project.calendar}
              onCalendarChange={handleCalendarChange}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-[#7aa3c8]"
            onClick={() => navigate(`/manual/${projectId}/edit`)}
          >
            <Pencil size={14} />
            Edit tasks
          </Button>
        </div>
      </header>

      {availableStatuses.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1e3a5f] bg-[#07172e] px-5 py-2.5">
          <span className="text-xs text-[#7aa3c8]">Status</span>
          <div className="flex gap-1">
            {availableStatuses.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    statuses: f.statuses.includes(s)
                      ? f.statuses.filter((x) => x !== s)
                      : [...f.statuses, s],
                  }))
                }
                className={`rounded-sm px-2 py-0.5 text-xs font-medium transition-colors ${
                  filters.statuses.length === 0 || filters.statuses.includes(s)
                    ? 'bg-[#1e3a5f] text-[#e8f4fd]'
                    : 'bg-[#0d2040] text-[#7aa3c8]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-[#7aa3c8]">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-[#7aa3c8]" />
              <span>Tasks</span>
            </div>
            <span>Drag horizontally to scroll</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#7aa3c8]">
            No tasks to display.
          </div>
        ) : (
          <GanttChart items={items} calendar={project?.calendar} />
        )}
      </div>
    </div>
  )
}
