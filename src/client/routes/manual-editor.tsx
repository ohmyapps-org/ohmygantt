import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Trash2, BarChart2, Share2, Link as LinkIcon, X, ArrowLeft, Check } from 'lucide-react'
import { getManualProject, updateManualProject, generateShareLink, revokeShareLink } from '@/lib/manual'
import type { ManualTask, ManualProject, Dependency } from '@/lib/manual'
import { Button } from '@/components/ui/button'
import DependencySelect from '@/components/gantt/DependencySelect'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'

function genId(): string {
  return crypto.randomUUID()
}

function newTask(): ManualTask {
  const now = Date.now()
  return {
    id: genId(),
    title: '',
    description: '',
    status: 'todo',
    dependencies: [],
    parentId: null,
    startDate: null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  }
}

export default function ManualEditorRoute() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ManualProject | null>(null)
  const [title, setTitle] = useState('')
  const [tasks, setTasks] = useState<ManualTask[]>([])
  const [saving, setSaving] = useState(false)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    getManualProject(projectId)
      .then((p) => {
        setProject(p)
        setTitle(p.title)
        setTasks(p.tasks)
        setShareId(p.shareId)
      })
      .catch(() => navigate('/'))
  }, [projectId, navigate])

  const save = useCallback(async () => {
    if (!project) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateManualProject(project.id, { title, tasks })
      setProject(updated)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [project, title, tasks])

  useEffect(() => {
    if (!project) return
    const timer = setTimeout(() => { save() }, 800)
    return () => clearTimeout(timer)
  }, [title, tasks, project, save])

  function updateTask(id: string, patch: Partial<ManualTask>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)))
  }

  function removeTask(id: string) {
    // Also remove this task as parent from children
    setTasks((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t) => ({
          ...t,
          parentId: t.parentId === id ? null : t.parentId,
          dependencies: t.dependencies.filter((d) => d.taskId !== id),
        }))
    )
  }

  function addTask() {
    setTasks((prev) => [...prev, newTask()])
  }

  async function handleShare() {
    if (!project) return
    if (shareId) {
      const url = `${window.location.origin}/manual/shared/${shareId}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      const result = await generateShareLink(project.id)
      setShareId(result.shareId)
      await updateManualProject(project.id, { title, tasks })
    }
  }

  async function handleRevokeShare() {
    if (!project || !shareId) return
    await revokeShareLink(project.id)
    setShareId(null)
  }

  const availableDeps = tasks.map((t, i) => ({ id: t.id, label: `#${i + 1} ${t.title || 'untitled'}` }))

  return (
    <div className="flex min-h-screen flex-col bg-[#07172e] text-[#e8f4fd]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e3a5f] bg-[#07172e] px-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 text-[#7aa3c8]">
            <ArrowLeft size={16} />
          </Button>
          <Link to="/" className="flex items-center gap-2 text-[#e8f4fd] hover:text-white">
            <span className="font-semibold text-sm tracking-wide">Gantt</span>
          </Link>
          <span className="text-[#1e3a5f]">/</span>
          <span className="text-sm text-[#7aa3c8]">Manual Entry</span>
          {saveError && (
            <span className="text-xs text-red-400 ml-2">{saveError}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Share2 size={14} />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent title="Share Project">
              <div className="space-y-3">
                <p className="text-xs text-[#7aa3c8]">
                  Generate a shareable link to let others view this project. No login required.
                </p>
                {shareId ? (
                  <>
                    <div className="relative rounded-md bg-[#07172e] border border-[#1e3a5f] p-3 font-mono text-xs text-[#7aa3c8] break-all">
                      {`${window.location.origin}/manual/shared/${shareId}`}
                      <button
                        onClick={handleShare}
                        className="absolute right-2 top-2 rounded p-1 text-[#7aa3c8] hover:bg-[#1e3a5f] hover:text-[#e8f4fd] transition-colors"
                      >
                        {copied ? <Check size={13} className="text-[#64CCC5]" /> : <LinkIcon size={13} />}
                      </button>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleRevokeShare}>
                      <X size={14} />
                      Revoke share link
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleShare} className="gap-1.5">
                    <Share2 size={14} />
                    Generate share link
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {project && (
            <Link to={`/manual/${project.id}`}>
              <Button size="sm" className="gap-1.5">
                <BarChart2 size={14} />
                View Gantt
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-6">
        <div className="mx-auto max-w-6xl">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title..."
            className="mb-6 w-full bg-transparent text-2xl font-semibold text-[#e8f4fd] placeholder-[#1e3a5f] outline-none border-none"
            style={{ fontFamily: 'var(--font-display)' }}
          />

          <div className="overflow-x-auto rounded-xl border border-[#1e3a5f] bg-[#0d2040]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e3a5f] text-xs text-[#7aa3c8]">
                  <th className="w-10 px-3 py-2.5 text-left font-medium">#</th>
                  <th className="px-2 py-2.5 text-left font-medium">Title</th>
                  <th className="px-2 py-2.5 text-left font-medium">Description</th>
                  <th className="w-28 px-2 py-2.5 text-left font-medium">Status</th>
                  <th className="w-28 px-2 py-2.5 text-left font-medium">Start date</th>
                  <th className="w-28 px-2 py-2.5 text-left font-medium">End date</th>
                  <th className="w-32 px-2 py-2.5 text-left font-medium">Parent</th>
                  <th className="w-44 px-2 py-2.5 text-left font-medium">Dependencies</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => (
                  <tr key={task.id} className="border-b border-[#1e3a5f]/50 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-[#7aa3c8] align-top pt-3.5">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value })}
                        placeholder="Task title..."
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-[#e8f4fd] placeholder-[#1e3a5f] outline-none focus:border-[#4988C4] focus:bg-[#07172e] transition-colors"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={task.description}
                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                        placeholder="Optional description..."
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-[#e8f4fd] placeholder-[#1e3a5f] outline-none focus:border-[#4988C4] focus:bg-[#07172e] transition-colors"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.id, { status: e.target.value as ManualTask['status'] })
                        }
                        className="w-full rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1.5 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] cursor-pointer"
                      >
                        <option value="todo">To do</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={task.startDate ?? ''}
                        onChange={(e) => updateTask(task.id, { startDate: e.target.value || null })}
                        className="w-full rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1.5 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] [color-scheme:dark]"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={task.endDate ?? ''}
                        onChange={(e) => updateTask(task.id, { endDate: e.target.value || null })}
                        className="w-full rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1.5 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] [color-scheme:dark]"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={task.parentId ?? ''}
                        onChange={(e) =>
                          updateTask(task.id, { parentId: e.target.value || null })
                        }
                        className="w-full rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1.5 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] cursor-pointer"
                      >
                        <option value="">— root —</option>
                        {tasks
                          .filter((t) => t.id !== task.id)
                          .map((t, ti) => (
                            <option key={t.id} value={t.id} style={{ background: '#0d2040' }}>
                              #{ti + 1} {t.title || 'untitled'}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <DependencySelect
                        taskId={task.id}
                        value={task.dependencies as Dependency[]}
                        availableDeps={availableDeps}
                        onChange={(deps) => updateTask(task.id, { dependencies: deps })}
                      />
                    </td>
                    <td className="px-3 py-2 align-top pt-3.5">
                      <button
                        onClick={() => removeTask(task.id)}
                        className="rounded p-1 text-[#7aa3c8] hover:bg-red-900/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-[#1e3a5f] px-3 py-3">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-[#7aa3c8]" onClick={addTask}>
                <Plus size={14} />
                Add task
              </Button>
            </div>
          </div>

          {tasks.length === 0 && (
            <div className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-[#7aa3c8]">No tasks yet. Add your first task to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
