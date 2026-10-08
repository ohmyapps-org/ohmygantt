import type { CalendarConfig } from './manual'
import { CALENDAR_PRESETS_STATIC } from './calendarPresets'

export function isNonWorkingDay(date: Date, calendar: CalendarConfig): boolean {
  const dow = date.getDay()
  if (calendar.weekendDays.includes(dow)) return true

  const month = date.getMonth() + 1 // 1-indexed
  const day = date.getDate()

  // Preset holidays for selected country
  if (calendar.country) {
    const preset = CALENDAR_PRESETS_STATIC.find((p) => p.country === calendar.country)
    if (preset) {
      if (preset.holidays.some((h) => h.month === month && h.day === day)) return true
    }
  }

  // Recurring custom days
  if (calendar.recurringDays.some((r) => r.month === month && r.day === day)) return true

  // One-off custom days
  const iso = `${date.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (calendar.customDays.includes(iso)) return true

  return false
}

/**
 * Returns the pixel offsets (from chart start) of all non-working days
 * in the chart range, to render as shaded columns.
 */
export function getNonWorkingOffsets(
  chartStart: Date,
  chartEnd: Date,
  dayWidth: number,
  calendar: CalendarConfig
): number[] {
  const offsets: number[] = []
  const d = new Date(chartStart)
  d.setHours(0, 0, 0, 0)
  let offset = 0

  while (d <= chartEnd) {
    if (isNonWorkingDay(d, calendar)) {
      offsets.push(offset * dayWidth)
    }
    d.setDate(d.getDate() + 1)
    offset++
  }

  return offsets
}

/**
 * Calculate the end date for a task given a start date and duration in working days.
 * Skips non-working days.
 */
export function addWorkingDays(start: Date, days: number, calendar: CalendarConfig): Date {
  const d = new Date(start)
  let remaining = days
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    if (!isNonWorkingDay(d, calendar)) {
      remaining--
    }
  }
  return d
}
