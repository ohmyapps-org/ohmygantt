import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Dependency, DependencyType } from '@/lib/manual'

type DepOption = { id: string; label: string }

type Props = {
  value: Dependency[]
  availableDeps: DepOption[]
  taskId: string
  onChange: (deps: Dependency[]) => void
}

const DEP_TYPES: DependencyType[] = ['FS', 'SS', 'FF', 'SF']

const DEP_TYPE_LABELS: Record<DependencyType, string> = {
  FS: 'Finish → Start',
  SS: 'Start → Start',
  FF: 'Finish → Finish',
  SF: 'Start → Finish',
}

function DepBadge({
  dep,
  label,
  onRemove,
  onChangeType,
  onChangeLag,
}: {
  dep: Dependency
  label: string
  onRemove: () => void
  onChangeType: (t: DependencyType) => void
  onChangeLag: (lag: number) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded bg-[#1e3a5f] px-1.5 py-0.5 text-[10px]">
      <select
        value={dep.type}
        onChange={(e) => onChangeType(e.target.value as DependencyType)}
        onClick={(e) => e.stopPropagation()}
        className="bg-transparent text-[#4988C4] outline-none cursor-pointer font-mono font-medium"
        style={{ fontSize: 10 }}
      >
        {DEP_TYPES.map((t) => (
          <option key={t} value={t} style={{ background: '#0d2040' }}>
            {t}
          </option>
        ))}
      </select>
      <span className="text-[#e8f4fd] truncate max-w-[80px]">{label}</span>
      <input
        type="number"
        value={dep.lag}
        onChange={(e) => onChangeLag(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className="w-8 bg-transparent text-center text-[#7aa3c8] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ fontSize: 10 }}
        title="Lag days (negative = lead)"
      />
      <span className="text-[#7aa3c8]">d</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="text-[#7aa3c8] hover:text-red-400 transition-colors ml-0.5"
      >
        <X size={9} />
      </button>
    </div>
  )
}

export default function DependencySelect({ value, availableDeps, taskId, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const filtered = availableDeps.filter((d) => d.id !== taskId)
  const selectedIds = new Set(value.map((d) => d.taskId))

  function addDep(depId: string) {
    if (selectedIds.has(depId)) return
    onChange([...value, { taskId: depId, type: 'FS', lag: 0 }])
  }

  function removeDep(taskId: string) {
    onChange(value.filter((d) => d.taskId !== taskId))
  }

  function updateDep(taskId: string, patch: Partial<Dependency>) {
    onChange(value.map((d) => (d.taskId === taskId ? { ...d, ...patch } : d)))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full min-h-[34px] rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1.5 text-xs text-left transition-colors',
            'hover:border-[#4988C4] focus:outline-none focus:border-[#4988C4]',
            value.length === 0 ? 'text-[#7aa3c8]' : 'text-[#e8f4fd]'
          )}
        >
          {value.length === 0 ? (
            'None'
          ) : (
            <div className="flex flex-wrap gap-1">
              {value.map((dep) => {
                const opt = availableDeps.find((d) => d.id === dep.taskId)
                if (!opt) return null
                return (
                  <DepBadge
                    key={dep.taskId}
                    dep={dep}
                    label={opt.label}
                    onRemove={() => removeDep(dep.taskId)}
                    onChangeType={(t) => updateDep(dep.taskId, { type: t })}
                    onChangeLag={(lag) => updateDep(dep.taskId, { lag })}
                  />
                )
              })}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 min-w-[220px]" sideOffset={4}>
        <p className="px-2 py-1 text-[10px] text-[#7aa3c8] border-b border-[#1e3a5f] mb-1">
          Add dependency
        </p>
        <div className="max-h-48 overflow-auto">
          {filtered.map((dep) => {
            const isSelected = selectedIds.has(dep.id)
            if (isSelected) return null
            return (
              <button
                key={dep.id}
                onClick={() => addDep(dep.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-left text-[#e8f4fd] hover:bg-[#1e3a5f] transition-colors"
              >
                <Plus size={11} className="text-[#4988C4]" />
                <span className="truncate">{dep.label}</span>
              </button>
            )
          })}
          {filtered.filter((d) => !selectedIds.has(d.id)).length === 0 && (
            <p className="px-2 py-4 text-xs text-center text-[#7aa3c8]">
              No more tasks available
            </p>
          )}
        </div>
        {value.length > 0 && (
          <>
            <p className="px-2 py-1 text-[10px] text-[#7aa3c8] border-t border-[#1e3a5f] mt-1">
              Type legend: FS=Finish→Start, SS=Start→Start, FF=Finish→Finish, SF=Start→Finish
            </p>
            <p className="px-2 pb-1 text-[10px] text-[#7aa3c8]">
              Lag (days): positive=delay, negative=lead
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
