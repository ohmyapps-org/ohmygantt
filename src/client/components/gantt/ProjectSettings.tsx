import { useState, useEffect } from 'react'
import { Settings, X, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { CalendarConfig, CalendarPreset } from '@/lib/manual'
import { getCalendarPresets } from '@/lib/manual'
import { CALENDAR_PRESETS_STATIC } from '@/lib/calendarPresets'

type Props = {
  projectId: string
  calendar: CalendarConfig
  onCalendarChange: (cal: Partial<CalendarConfig>) => Promise<void>
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ProjectSettings({ calendar, onCalendarChange }: Props) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar'>('calendar')
  const [presets, setPresets] = useState<CalendarPreset[]>(CALENDAR_PRESETS_STATIC as CalendarPreset[])
  const [saving, setSaving] = useState(false)
  const [newDay, setNewDay] = useState('')
  const [newRecurMonth, setNewRecurMonth] = useState(1)
  const [newRecurDay, setNewRecurDay] = useState(1)

  useEffect(() => {
    if (!open) return
    getCalendarPresets().then(setPresets).catch(() => {})
  }, [open])

  async function save(patch: Partial<CalendarConfig>) {
    setSaving(true)
    try {
      await onCalendarChange(patch)
    } finally {
      setSaving(false)
    }
  }

  async function handleCountryChange(country: string) {
    const preset = presets.find((p) => p.country === country)
    await save({
      country: country || null,
      weekendDays: preset?.weekendDays ?? [0, 6],
    })
  }

  async function toggleWeekend(dow: number) {
    const current = calendar.weekendDays
    const next = current.includes(dow) ? current.filter((d) => d !== dow) : [...current, dow]
    await save({ weekendDays: next })
  }

  async function addCustomDay() {
    if (!newDay || calendar.customDays.includes(newDay)) return
    await save({ customDays: [...calendar.customDays, newDay] })
    setNewDay('')
  }

  async function removeCustomDay(day: string) {
    await save({ customDays: calendar.customDays.filter((d) => d !== day) })
  }

  async function addRecurringDay() {
    if (calendar.recurringDays.some((r) => r.month === newRecurMonth && r.day === newRecurDay)) return
    await save({ recurringDays: [...calendar.recurringDays, { month: newRecurMonth, day: newRecurDay }] })
  }

  async function removeRecurringDay(month: number, day: number) {
    await save({ recurringDays: calendar.recurringDays.filter((r) => !(r.month === month && r.day === day)) })
  }

  const selectedPreset = presets.find((p) => p.country === calendar.country)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7aa3c8]" title="Project settings">
          <Settings size={15} />
        </Button>
      </DialogTrigger>
      <DialogContent title="Project Settings">
        <div className="flex gap-0 border-b border-[#1e3a5f] mb-4 -mt-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'calendar'
                ? 'border-[#4988C4] text-[#e8f4fd]'
                : 'border-transparent text-[#7aa3c8] hover:text-[#e8f4fd]'
            }`}
          >
            Calendar
          </button>
        </div>

        {activeTab === 'calendar' && (
          <div className="space-y-5 text-xs">
            {/* Country preset */}
            <div>
              <label className="block text-[#7aa3c8] mb-1.5 font-medium">Country preset</label>
              <select
                value={calendar.country ?? ''}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={saving}
                className="w-full rounded border border-[#1e3a5f] bg-[#07172e] px-3 py-2 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] cursor-pointer"
              >
                <option value="">None</option>
                {presets.map((p) => (
                  <option key={p.country} value={p.country} style={{ background: '#0d2040' }}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Preset holidays preview */}
              {selectedPreset && (
                <div className="mt-2 rounded border border-[#1e3a5f] bg-[#07172e] p-2 max-h-32 overflow-auto">
                  <p className="text-[10px] text-[#7aa3c8] mb-1">Included holidays:</p>
                  {selectedPreset.holidays.map((h) => (
                    <div key={`${h.month}-${h.day}`} className="flex justify-between text-[10px] py-0.5">
                      <span className="text-[#e8f4fd]">{h.name}</span>
                      <span className="text-[#7aa3c8] font-mono">
                        {String(h.month).padStart(2, '0')}/{String(h.day).padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekend days */}
            <div>
              <label className="block text-[#7aa3c8] mb-1.5 font-medium">Weekend days</label>
              <div className="flex gap-1">
                {WEEKDAY_LABELS.map((label, dow) => (
                  <button
                    key={dow}
                    onClick={() => toggleWeekend(dow)}
                    disabled={saving}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                      calendar.weekendDays.includes(dow)
                        ? 'bg-[#4988C4] text-[#07172e]'
                        : 'bg-[#0d2040] text-[#7aa3c8] hover:bg-[#1e3a5f]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* One-off custom days */}
            <div>
              <label className="block text-[#7aa3c8] mb-1.5 font-medium">
                Custom non-working days
                <span className="font-normal ml-1 text-[#4988C480]">(one-off)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  className="flex-1 rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] [color-scheme:dark]"
                />
                <Button size="sm" onClick={addCustomDay} disabled={!newDay || saving} className="gap-1">
                  <Plus size={12} /> Add
                </Button>
              </div>
              {calendar.customDays.length > 0 && (
                <div className="space-y-0.5">
                  {calendar.customDays.map((day) => (
                    <div key={day} className="flex items-center justify-between rounded px-2 py-1 bg-[#0d2040]">
                      <span className="font-mono text-[#e8f4fd]">{day}</span>
                      <button onClick={() => removeCustomDay(day)} className="text-[#7aa3c8] hover:text-red-400">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring days */}
            <div>
              <label className="block text-[#7aa3c8] mb-1.5 font-medium">
                Recurring non-working days
                <span className="font-normal ml-1 text-[#4988C480]">(annual)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={newRecurMonth}
                  onChange={(e) => setNewRecurMonth(Number(e.target.value))}
                  className="rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m} style={{ background: '#0d2040' }}>
                      {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2000, m - 1))}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={newRecurDay}
                  onChange={(e) => setNewRecurDay(Number(e.target.value))}
                  className="w-16 rounded border border-[#1e3a5f] bg-[#07172e] px-2 py-1 text-xs text-[#e8f4fd] outline-none focus:border-[#4988C4] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button size="sm" onClick={addRecurringDay} disabled={saving} className="gap-1">
                  <Plus size={12} /> Add
                </Button>
              </div>
              {calendar.recurringDays.length > 0 && (
                <div className="space-y-0.5">
                  {calendar.recurringDays.map((r) => (
                    <div
                      key={`${r.month}-${r.day}`}
                      className="flex items-center justify-between rounded px-2 py-1 bg-[#0d2040]"
                    >
                      <span className="font-mono text-[#e8f4fd]">
                        Every {String(r.month).padStart(2, '0')}/{String(r.day).padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => removeRecurringDay(r.month, r.day)}
                        className="text-[#7aa3c8] hover:text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
