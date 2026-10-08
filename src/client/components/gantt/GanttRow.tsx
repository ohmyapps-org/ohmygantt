import { ChevronRight, ExternalLink } from 'lucide-react'
import GanttBar from './GanttBar'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getCodeColor } from '@/lib/gantt'
import { daysBetween, startOfDay } from '@/lib/dates'
import type { GanttItem } from '@/lib/gantt'

type Props = {
  item: GanttItem
  chartStart: Date
  dayWidth: number
  rowHeight: number
  totalWidth: number
  sidebarWidth: number
  isEven: boolean
  depth?: number
  hasChildren?: boolean
  isCollapsed?: boolean
  onToggle?: () => void
}

export default function GanttRow({
  item,
  chartStart,
  dayWidth,
  rowHeight,
  totalWidth,
  sidebarWidth,
  isEven,
  depth = 0,
  hasChildren = false,
  isCollapsed = false,
  onToggle,
}: Props) {
  const start = startOfDay(chartStart)
  const itemStart = startOfDay(item.start)
  const itemEnd = startOfDay(item.end)

  const left = Math.max(0, daysBetween(start, itemStart)) * dayWidth
  const width = Math.max(1, daysBetween(itemStart, itemEnd)) * dayWidth

  const color = getCodeColor(item.code)
  const indentPx = 12 + depth * 16
  const chevronWidth = hasChildren ? 20 : 0

  return (
    <div
      className="flex"
      style={{ height: rowHeight, borderBottom: '1px solid #1e3a5f20' }}
    >
      {/* Sidebar cell */}
      <div
        className="flex shrink-0 items-center gap-2 pr-3 sticky left-0 z-10"
        style={{
          width: sidebarWidth,
          height: rowHeight,
          paddingLeft: indentPx,
          backgroundColor: isEven ? '#07172e' : '#080e1c',
          borderRight: '1px solid #1e3a5f',
        }}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={onToggle}
            className="shrink-0 rounded p-0.5 text-[#7aa3c8] hover:text-[#e8f4fd] hover:bg-[#1e3a5f] transition-colors"
            style={{ width: chevronWidth, height: chevronWidth }}
          >
            <ChevronRight
              size={12}
              style={{
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>
        ) : (
          depth > 0 && (
            <div
              className="shrink-0"
              style={{ width: 20, height: 20, display: 'flex', alignItems: 'center' }}
            >
              <div className="w-2 h-px bg-[#1e3a5f]" />
            </div>
          )
        )}

        <div
          className="h-1.5 w-1.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0 flex-1">
          <a
            href={item.url || undefined}
            target={item.url ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-xs text-[#e8f4fd] hover:text-white"
          >
            <span className="truncate">{item.title}</span>
            {item.url && (
              <ExternalLink
                size={10}
                className="shrink-0 text-[#7aa3c8] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </a>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-mono text-[10px] text-[#7aa3c8]">#{item.issueNumber}</span>
            <Badge
              variant="code"
              className="px-1 py-0 leading-tight"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {item.code}
            </Badge>
            {item.milestone && (
              <span className="font-mono text-[10px] text-[#64CCC5] truncate max-w-[80px]">
                {item.milestone.title}
              </span>
            )}
          </div>
        </div>
        {item.assignees.slice(0, 2).map((a) => (
          <Avatar key={a.login} src={a.avatarUrl} fallback={a.login} size={20} className="shrink-0" />
        ))}
      </div>

      {/* Timeline cell */}
      <div
        className="relative shrink-0"
        style={{
          width: totalWidth,
          height: rowHeight,
          backgroundColor: isEven ? '#07172e' : '#080e1c',
        }}
      >
        <GanttBar item={item} left={left} width={width} rowHeight={rowHeight} />
      </div>
    </div>
  )
}
