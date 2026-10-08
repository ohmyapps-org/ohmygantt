import { useRef, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import GanttRow from './GanttRow'
import { TooltipProvider } from '@/components/ui/tooltip'
import { daysBetween, addDays, startOfDay, getMonthSpans, eachWeekStart, formatDate } from '@/lib/dates'
import type { GanttItem } from '@/lib/gantt'
import type { CalendarConfig } from '@/lib/manual'
import { getNonWorkingOffsets } from '@/lib/calendar'

const SIDEBAR_WIDTH = 260
const ROW_HEIGHT = 48
const HEADER_HEIGHT = 56
const DAY_WIDTH = 28

type RenderEntry = { item: GanttItem; depth: number }

type Props = {
  items: GanttItem[]
  calendar?: CalendarConfig
}

function MilestoneDiamond({ offset, label }: { offset: number; label: string }) {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 z-20 group" style={{ left: offset - 6 }}>
      <div className="h-3 w-3 rotate-45 border border-[#64CCC5] bg-[#64CCC5]" style={{ opacity: 0.4 }} />
      <div className="absolute left-1/2 -translate-x-1/2 top-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-[#0d2040] border border-[#1e3a5f] rounded px-2 py-1 text-[10px] text-[#64CCC5] font-medium pointer-events-none">
        {label}
      </div>
    </div>
  )
}

function GanttTimeline({
  chartStart,
  chartEnd,
  totalWidth,
  todayOffset,
  milestones,
}: {
  chartStart: Date
  chartEnd: Date
  totalWidth: number
  todayOffset: number | null
  milestones: { title: string; date: Date }[]
}) {
  const monthSpans = useMemo(() => getMonthSpans(chartStart, chartEnd, DAY_WIDTH), [chartStart, chartEnd])
  const weeks = useMemo(() => eachWeekStart(chartStart, chartEnd), [chartStart, chartEnd])

  return (
    <div
      className="sticky top-0 z-20 border-b border-[#1e3a5f] bg-[#0d2040]"
      style={{ width: SIDEBAR_WIDTH + totalWidth, height: HEADER_HEIGHT }}
    >
      <div className="flex" style={{ height: HEADER_HEIGHT }}>
        <div
          className="sticky left-0 z-30 flex shrink-0 items-end pb-1 px-3 border-r border-[#1e3a5f] bg-[#0d2040]"
          style={{ width: SIDEBAR_WIDTH, height: HEADER_HEIGHT }}
        >
          <span className="text-xs font-medium text-[#7aa3c8]">Task</span>
        </div>

        <div className="relative" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
          <div className="flex" style={{ height: 26 }}>
            {monthSpans.map((span) => (
              <div
                key={`${span.label}-${span.startOffset}`}
                className="overflow-hidden border-r border-[#1e3a5f] px-2 flex items-center"
                style={{ width: span.days * DAY_WIDTH, height: 26 }}
              >
                <span className="text-xs font-medium text-[#7aa3c8] whitespace-nowrap">{span.label}</span>
              </div>
            ))}
          </div>

          <div className="relative" style={{ height: 30 }}>
            {weeks.map((week) => {
              const offset = Math.max(0, daysBetween(chartStart, week)) * DAY_WIDTH
              if (offset > totalWidth) return null
              return (
                <div
                  key={week.toISOString()}
                  className="absolute top-0 flex items-center justify-start px-1"
                  style={{ left: offset, width: 7 * DAY_WIDTH, height: 30 }}
                >
                  <span className="text-[10px] text-[#4988C4] whitespace-nowrap">{formatDate(week)}</span>
                </div>
              )
            })}
            {weeks.map((week) => {
              const offset = Math.max(0, daysBetween(chartStart, week)) * DAY_WIDTH
              if (offset > totalWidth || offset < 0) return null
              return (
                <div
                  key={`line-${week.toISOString()}`}
                  className="absolute top-0 bottom-0"
                  style={{ left: offset, width: 1, backgroundColor: '#1e3a5f' }}
                />
              )
            })}
          </div>

          {todayOffset !== null && todayOffset >= 0 && todayOffset <= totalWidth && (
            <div
              className="absolute top-0 z-10"
              style={{ left: todayOffset, width: 2, height: HEADER_HEIGHT, backgroundColor: '#BDE8F5', opacity: 0.6 }}
            />
          )}

          {milestones.map((m) => {
            const offset = daysBetween(chartStart, m.date) * DAY_WIDTH
            if (offset < 0 || offset > totalWidth) return null
            return <MilestoneDiamond key={m.title} offset={offset} label={m.title} />
          })}
        </div>
      </div>
    </div>
  )
}

function DependencyArrows({
  renderList,
  itemIndex,
  chartStart,
  dayWidth,
  rowHeight,
  sidebarWidth,
  totalWidth,
}: {
  renderList: RenderEntry[]
  itemIndex: Map<string, number>
  chartStart: Date
  dayWidth: number
  rowHeight: number
  sidebarWidth: number
  totalWidth: number
}) {
  const paths: { d: string; key: string }[] = []

  for (const { item } of renderList) {
    if (!item.dependencies?.length) continue
    const succIndex = itemIndex.get(item.id)
    if (succIndex === undefined) continue

    for (const dep of item.dependencies) {
      const predIndex = itemIndex.get(dep.taskId)
      if (predIndex === undefined) continue
      const predItem = renderList[predIndex]?.item
      if (!predItem) continue

      const predL = sidebarWidth + Math.max(0, daysBetween(chartStart, startOfDay(predItem.start))) * dayWidth
      const predR = predL + Math.max(1, daysBetween(startOfDay(predItem.start), startOfDay(predItem.end))) * dayWidth
      const succL = sidebarWidth + Math.max(0, daysBetween(chartStart, startOfDay(item.start))) * dayWidth
      const succR = succL + Math.max(1, daysBetween(startOfDay(item.start), startOfDay(item.end))) * dayWidth

      const predY = predIndex * rowHeight + rowHeight / 2
      const succY = succIndex * rowHeight + rowHeight / 2

      let x1: number, y1: number, x2: number, y2: number
      switch (dep.type) {
        case 'FS': x1 = predR; y1 = predY; x2 = succL;  y2 = succY; break
        case 'SS': x1 = predL; y1 = predY; x2 = succL;  y2 = succY; break
        case 'FF': x1 = predR; y1 = predY; x2 = succR;  y2 = succY; break
        case 'SF': x1 = predL; y1 = predY; x2 = succR;  y2 = succY; break
        default:   x1 = predR; y1 = predY; x2 = succL;  y2 = succY
      }

      const dx = Math.max(Math.abs(x2 - x1) * 0.5, 24)
      const sx = x2 >= x1 ? 1 : -1
      const d = `M ${x1} ${y1} C ${x1 + dx * sx} ${y1}, ${x2 - dx * sx} ${y2}, ${x2} ${y2}`
      paths.push({ d, key: `${item.id}-${dep.taskId}-${dep.type}` })
    }
  }

  if (paths.length === 0) return null

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: sidebarWidth + totalWidth, height: '100%', zIndex: 5, overflow: 'visible' }}
    >
      <defs>
        <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#4988C4" opacity="0.6" />
        </marker>
      </defs>
      {paths.map(({ d, key }) => (
        <path
          key={key}
          d={d}
          fill="none"
          stroke="#4988C4"
          strokeWidth="1.5"
          strokeOpacity="0.45"
          markerEnd="url(#dep-arrow)"
        />
      ))}
    </svg>
  )
}

export default function GanttChart({ items, calendar }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const milestones = useMemo(() => {
    const map = new Map<string, Date>()
    for (const item of items) {
      if (item.milestone?.dueOn && !map.has(item.milestone.title)) {
        map.set(item.milestone.title, startOfDay(new Date(item.milestone.dueOn)))
      }
    }
    return Array.from(map.entries())
      .map(([title, date]) => ({ title, date }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [items])

  const { chartStart, chartEnd, totalWidth, todayOffset } = useMemo(() => {
    const today = startOfDay(new Date())
    const endOfYear = new Date(today.getFullYear(), 11, 31)

    if (items.length === 0) {
      const start = addDays(today, -7)
      const end = new Date(Math.max(addDays(today, 60).getTime(), endOfYear.getTime()))
      return {
        chartStart: startOfDay(start),
        chartEnd: startOfDay(end),
        totalWidth: daysBetween(start, end) * DAY_WIDTH,
        todayOffset: 7 * DAY_WIDTH,
      }
    }

    const minStart = new Date(Math.min(...items.map((i) => i.start.getTime())))
    const maxEnd = new Date(Math.max(...items.map((i) => i.end.getTime())))
    const start = addDays(startOfDay(minStart), -7)
    const end = new Date(Math.max(addDays(startOfDay(maxEnd), 7).getTime(), endOfYear.getTime()))
    const total = daysBetween(start, end) * DAY_WIDTH
    const todayOff = daysBetween(start, today) * DAY_WIDTH

    return { chartStart: start, chartEnd: end, totalWidth: total, todayOffset: todayOff }
  }, [items])

  // Build render list (DFS, respects collapse state)
  const { renderList, childrenSetIds } = useMemo(() => {
    const childrenMap = new Map<string | null, GanttItem[]>()
    for (const item of items) {
      const pid = item.parentId ?? null
      if (!childrenMap.has(pid)) childrenMap.set(pid, [])
      childrenMap.get(pid)!.push(item)
    }

    const childrenSetIds = new Set<string>()
    for (const [pid, children] of childrenMap) {
      if (pid !== null && children.length > 0) childrenSetIds.add(pid)
    }

    const list: RenderEntry[] = []
    function walk(parentId: string | null, depth: number) {
      for (const child of childrenMap.get(parentId) ?? []) {
        list.push({ item: child, depth })
        if (!collapsed.has(child.id)) walk(child.id, depth + 1)
      }
    }
    walk(null, 0)
    return { renderList: list, childrenSetIds }
  }, [items, collapsed])

  const itemIndex = useMemo(() => {
    const m = new Map<string, number>()
    renderList.forEach(({ item }, idx) => m.set(item.id, idx))
    return m
  }, [renderList])

  const nonWorkingOffsets = useMemo(() => {
    if (!calendar) return []
    return getNonWorkingOffsets(chartStart, chartEnd, DAY_WIDTH, calendar)
  }, [chartStart, chartEnd, calendar])

  if (items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-[#7aa3c8] text-sm">
        No items to display. Try adjusting the filters.
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col overflow-hidden" style={{ height: '100%' }}>
        <div ref={scrollRef} className="overflow-auto flex-1">
          <div style={{ width: SIDEBAR_WIDTH + totalWidth, minWidth: '100%' }}>
            <GanttTimeline
              chartStart={chartStart}
              chartEnd={chartEnd}
              totalWidth={totalWidth}
              todayOffset={todayOffset}
              milestones={milestones}
            />

            {/* Rows area — position:relative so overlays anchor here */}
            <div className="relative">
              {/* Non-working day bands */}
              {nonWorkingOffsets.map((offset) => (
                <div
                  key={offset}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: SIDEBAR_WIDTH + offset,
                    width: DAY_WIDTH,
                    backgroundColor: '#1e3a5f',
                    opacity: 0.13,
                    zIndex: 0,
                  }}
                />
              ))}

              {/* Today line */}
              {todayOffset !== null && todayOffset >= 0 && todayOffset <= totalWidth && (
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: SIDEBAR_WIDTH + todayOffset, width: 2, backgroundColor: '#BDE8F5', opacity: 0.25 }}
                />
              )}

              {/* Milestone dashed lines */}
              {milestones.map((m) => {
                const offset = daysBetween(chartStart, m.date) * DAY_WIDTH
                if (offset < 0 || offset > totalWidth) return null
                return (
                  <div
                    key={m.title}
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{ left: SIDEBAR_WIDTH + offset, width: 1, borderLeft: '1px dashed #64CCC5', opacity: 0.3 }}
                  />
                )
              })}

              {/* Dependency arrows SVG */}
              <DependencyArrows
                renderList={renderList}
                itemIndex={itemIndex}
                chartStart={chartStart}
                dayWidth={DAY_WIDTH}
                rowHeight={ROW_HEIGHT}
                sidebarWidth={SIDEBAR_WIDTH}
                totalWidth={totalWidth}
              />

              {/* Rows with AnimatePresence */}
              <AnimatePresence initial={false}>
                {renderList.map(({ item, depth }, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: ROW_HEIGHT, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <GanttRow
                      item={item}
                      chartStart={chartStart}
                      dayWidth={DAY_WIDTH}
                      rowHeight={ROW_HEIGHT}
                      totalWidth={totalWidth}
                      sidebarWidth={SIDEBAR_WIDTH}
                      isEven={idx % 2 === 0}
                      depth={depth}
                      hasChildren={childrenSetIds.has(item.id)}
                      isCollapsed={collapsed.has(item.id)}
                      onToggle={() => toggleCollapse(item.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
