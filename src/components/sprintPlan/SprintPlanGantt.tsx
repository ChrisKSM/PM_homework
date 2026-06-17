import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'
import type { SprintPlanTimeline, SprintPlanRisk } from '../../types/sprintPlan'
import RiskDescriptionPanel from './RiskDescriptionPanel'
import {
  TIMELINE_WIDTH_PX,
  SUMMARY_COL_W,
  SPRINT_COL_W,
  ROW_HEIGHT_PX,
  barStyleForGantt,
  buildGanttMonthTicks,
  issueTypeBarColor,
  markerLeftOnTimeline,
  rowMvpLabels,
  todayMarkerLeft,
} from './sprintPlanUtils'

interface SprintPlanGanttProps {
  data: SprintPlanTimeline
}

export default function SprintPlanGantt({ data }: SprintPlanGanttProps) {
  const [selectedRisk, setSelectedRisk] = useState<SprintPlanRisk | null>(null)

  const { ganttStart, ganttEnd } = data

  const monthTicks = useMemo(
    () => buildGanttMonthTicks(ganttStart, ganttEnd),
    [ganttStart, ganttEnd],
  )
  const todayLeft = useMemo(() => todayMarkerLeft(ganttStart, ganttEnd), [ganttStart, ganttEnd])

  const sortedRows = useMemo(
    () =>
      [...data.rows].sort((a, b) => {
        const dateCmp = a.startDate.localeCompare(b.startDate)
        if (dateCmp !== 0) return dateCmp
        const order = { Epic: 0, Story: 1, Risk: 2 } as const
        const typeCmp = (order[a.issueType] ?? 3) - (order[b.issueType] ?? 3)
        if (typeCmp !== 0) return typeCmp
        return a.issueKey.localeCompare(b.issueKey)
      }),
    [data.rows],
  )

  const openRisk = (risk: SprintPlanRisk) => setSelectedRisk(risk)

  return (
    <>
      <div className="border border-surface-border rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <div style={{ minWidth: SUMMARY_COL_W + SPRINT_COL_W + TIMELINE_WIDTH_PX }}>
            {/* Header */}
            <div className="flex border-b border-surface-border bg-surface-page">
              <div
                className="shrink-0 px-4 py-3 border-r border-surface-border sticky left-0 z-20 bg-surface-page"
                style={{ width: SUMMARY_COL_W }}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Summary</span>
              </div>
              <div
                className="shrink-0 px-3 py-3 border-r border-surface-border sticky z-20 bg-surface-page"
                style={{ width: SPRINT_COL_W, left: SUMMARY_COL_W }}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Sprint 기간</span>
              </div>
              <div className="flex-1 relative" style={{ minWidth: TIMELINE_WIDTH_PX }}>
                <div className="relative h-9 px-1">
                  {monthTicks.map((tick) => (
                    <div
                      key={tick.label}
                      className="absolute top-0 bottom-0 flex items-end pb-0.5 pl-1"
                      style={{ left: tick.left }}
                    >
                      <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">{tick.label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-0 border-b-2 border-gray-400 mx-1" aria-hidden />
              </div>
            </div>

            {/* Rows */}
            {sortedRows.map((row, index) => {
              const bar = barStyleForGantt(row, ganttStart, ganttEnd)
              const isActive = row.status === 'active'
              const barColor = issueTypeBarColor(row.issueType, row.status)
              const primaryRisk = row.risks[0] ?? null
              const isRiskRow = row.issueType === 'Risk'

              return (
                <div
                  key={row.id}
                  className={clsx(
                    'flex border-b border-surface-muted',
                    index % 2 === 1 && 'bg-surface-page/40',
                    isActive && 'bg-lg-red-light/20',
                  )}
                >
                  <div
                    className={clsx(
                      'shrink-0 px-2 border-r border-surface-muted sticky left-0 z-10 bg-white flex items-center min-w-0',
                      index % 2 === 1 && 'bg-surface-page/40',
                      isActive && 'bg-lg-red-light/20',
                    )}
                    style={{ width: SUMMARY_COL_W, height: ROW_HEIGHT_PX }}
                  >
                    <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
                      <span
                        className={clsx(
                          'shrink-0 text-[9px] font-black px-1 py-0.5 rounded',
                          row.issueType === 'Epic' && 'bg-blue-100 text-blue-800',
                          row.issueType === 'Story' && 'bg-gray-100 text-gray-700',
                          row.issueType === 'Risk' && 'bg-amber-100 text-amber-900',
                        )}
                      >
                        {row.issueType}
                      </span>
                      <a
                        href={row.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[9px] font-mono font-semibold text-lg-red hover:underline"
                      >
                        {row.issueKey}
                      </a>
                      <span className="shrink-0 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">
                        {row.gate}
                      </span>
                      {(row.isMvp || rowMvpLabels(row.labels).length > 0) && (
                        <span className="shrink-0 text-[9px] font-black px-1 py-0.5 rounded bg-purple-100 text-purple-800">
                          MVP
                        </span>
                      )}
                      <span className="truncate text-[11px] text-gray-800 font-medium" title={row.summary}>
                        {row.summary}
                      </span>
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'shrink-0 px-1.5 border-r border-surface-muted text-[10px] text-gray-700 font-medium sticky z-10 bg-white flex items-center',
                      index % 2 === 1 && 'bg-surface-page/40',
                      isActive && 'bg-lg-red-light/20',
                    )}
                    style={{ width: SPRINT_COL_W, left: SUMMARY_COL_W, height: ROW_HEIGHT_PX }}
                  >
                    {isRiskRow && primaryRisk ? (
                      <button
                        type="button"
                        onClick={() => openRisk(primaryRisk)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black tracking-tight hover:bg-amber-600 transition-colors"
                        title={row.sprintLabel}
                      >
                        <AlertTriangle size={10} className="shrink-0" />
                        RISK
                      </button>
                    ) : (
                      <span className="truncate whitespace-nowrap" title={row.sprintLabel}>
                        {row.sprintLabel}
                      </span>
                    )}
                  </div>

                  <div
                    className="relative flex-1 pr-2"
                    style={{ minWidth: TIMELINE_WIDTH_PX, height: ROW_HEIGHT_PX }}
                  >
                    {monthTicks.map((tick) => (
                      <div
                        key={`${row.id}-${tick.label}`}
                        className="absolute top-0 bottom-0 border-l border-surface-muted/70 pointer-events-none"
                        style={{ left: tick.left }}
                      />
                    ))}

                    <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300 pointer-events-none" />

                    {todayLeft != null && (
                      <div
                        className="absolute top-1 bottom-1 w-px bg-lg-red/60 z-[1] pointer-events-none"
                        style={{ left: `${todayLeft}%` }}
                        title="Today"
                      />
                    )}

                    {bar.visible && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-4 rounded opacity-90"
                        style={{
                          left: bar.left,
                          width: bar.width,
                          backgroundColor: barColor,
                        }}
                        title={`${row.issueKey}: ${row.summary}`}
                      />
                    )}

                    {row.risks.map((risk) => (
                      <button
                        key={risk.id}
                        type="button"
                        onClick={() => openRisk(risk)}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-[2] focus:outline-none focus-visible:ring-2 focus-visible:ring-lg-red focus-visible:ring-offset-1"
                        style={{
                          left: markerLeftOnTimeline(risk, row, ganttStart, ganttEnd),
                        }}
                        title={risk.summary}
                      >
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black tracking-tight border-2 border-white group-hover:bg-amber-600 transition-colors">
                          <AlertTriangle size={10} className="shrink-0" />
                          RISK
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-surface-muted bg-surface-page flex flex-wrap gap-4 text-[11px] text-gray-500 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500" />
            Epic
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            Story
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1 rounded">Gate 0/1/2</span>
            fixVersions {data.meta.fixVersionField} 대체
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-black px-1 rounded bg-purple-100 text-purple-800">MVP</span>
            labels=MVP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" />
            Risk (Bug + labels={data.meta.riskLabel})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="px-1 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black">RISK</span>
            클릭 → Description · Environment
          </span>
        </div>
      </div>

      <RiskDescriptionPanel
        risk={selectedRisk}
        browseBase={data.meta.jiraBrowseBase}
        onClose={() => setSelectedRisk(null)}
      />
    </>
  )
}
