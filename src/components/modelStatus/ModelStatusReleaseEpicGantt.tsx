import { useMemo } from 'react'
import clsx from 'clsx'
import { ExternalLink, Target, TrendingUp } from 'lucide-react'
import { useModelStatusInitiatives } from '../../hooks/useModelStatusInitiatives'
import { releaseGanttForModel } from '../../mocks/mockModelReleaseEpicGantt'
import type { ModelReleaseGanttData } from '../../types/modelStatusReleaseGantt'
import { jiraBrowseUrl } from '../../utils/jiraBrowseUrl'

const COL_W = 72

export interface ReleaseGanttKpiProps {
  kpi1Value: string
  kpi1Sub: string
  kpi1Trend?: number
  kpi2Value: string
  kpi2Sub: string
  kpi2Trend?: number
}

interface Props extends ReleaseGanttKpiProps {
  modelCode: string
  active: boolean
}

function sprintRange(min: number, max: number) {
  const out: number[] = []
  for (let sp = min; sp <= max; sp += 1) out.push(sp)
  return out
}

function epicBarStyle(startSp: number, endSp: number, sprintMin: number) {
  const left = (startSp - sprintMin) * COL_W + 4
  const width = (endSp - startSp + 1) * COL_W - 8
  return { left, width: Math.max(width, 24) }
}

export default function ModelStatusReleaseEpicGantt({
  modelCode,
  active,
  kpi1Value,
  kpi1Sub,
  kpi1Trend,
  kpi2Value,
  kpi2Sub,
  kpi2Trend,
}: Props) {
  const { data: initData } = useModelStatusInitiatives(modelCode, active)
  const gantt: ModelReleaseGanttData = useMemo(() => releaseGanttForModel(modelCode), [modelCode])
  const sprints = useMemo(
    () => sprintRange(gantt.sprintMin, gantt.sprintMax),
    [gantt.sprintMin, gantt.sprintMax],
  )
  const gridW = sprints.length * COL_W

  const initiative = initData?.issues?.[0] ?? null

  return (
    <div className="space-y-4">
      {/* KPI-1 · KPI-2 — 릴리즈 탭 상단 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">KPI-1 작업 완료율</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{kpi1Value}</p>
              <p className="text-xs text-gray-600 mt-1">{kpi1Sub}</p>
              {kpi1Trend != null && (
                <p className="text-[11px] text-emerald-600 mt-2">▲ {kpi1Trend}% · 목표 ≥95%</p>
              )}
            </div>
            <TrendingUp className="text-blue-500 shrink-0" size={28} />
          </div>
        </div>
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-violet-800 uppercase tracking-wide">KPI-2 일정 준수율</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{kpi2Value}</p>
              <p className="text-xs text-gray-600 mt-1">{kpi2Sub}</p>
              {kpi2Trend != null && (
                <p className="text-[11px] text-emerald-600 mt-2">▲ {kpi2Trend}% · 추세 일정 유지</p>
              )}
            </div>
            <Target className="text-violet-500 shrink-0" size={28} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">릴리즈 Gantt · 마일스톤</h3>
            <p className="text-[11px] text-gray-500">Initiative → Epic 실행 구간 · M1~M5 (Mock — Jira Epic 연동 예정)</p>
          </div>
          <span className="text-[10px] text-gray-400">→ 7.5.3 일정 대시보드</span>
        </div>

        {/* Initiative */}
        <div className="px-4 py-2 bg-slate-50 border-b border-surface-border text-[11px]">
          <span className="font-semibold text-gray-500 mr-2">Initiative</span>
          {initiative ? (
            <a
              href={initiative.issueUrl || jiraBrowseUrl(initiative.key)}
              target="_blank"
              rel="noreferrer"
              className="text-violet-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              {initiative.key} · {initiative.summary.slice(0, 48)}
              {initiative.summary.length > 48 ? '…' : ''}
              <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-gray-400">({modelCode} Initiative — Initiative 탭·Jira 연동)</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: 280 + gridW }}>
            {/* IR bands */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <div className="shrink-0 w-[280px] px-3 py-2 text-[10px] font-bold text-gray-600 border-r border-gray-200">
                EPIC (실행 구간)
              </div>
              <div className="flex" style={{ width: gridW }}>
                {gantt.irBands.map((ir) => {
                  const span = ir.sprintTo - ir.sprintFrom + 1
                  return (
                    <div
                      key={ir.id}
                      className="border-r border-gray-200 px-1 py-2 text-center"
                      style={{ width: span * COL_W }}
                    >
                      <div className="text-[10px] font-bold text-gray-800">{ir.title}</div>
                      <div className="text-[9px] text-gray-500">{ir.subtitle}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SP + milestones */}
            <div className="flex border-b border-gray-200">
              <div className="shrink-0 w-[280px] border-r border-gray-200" />
              <div className="flex relative" style={{ width: gridW }}>
                {sprints.map((sp) => {
                  const ms = gantt.milestones.find((m) => m.sprint === sp)
                  return (
                    <div
                      key={sp}
                      className="shrink-0 border-r border-gray-100 text-center py-1.5 relative"
                      style={{ width: COL_W }}
                    >
                      <div className="text-[10px] font-semibold text-gray-700">SP{String(sp).padStart(2, '0')}</div>
                      {ms && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-600 text-white">
                          {ms.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Epic rows */}
            {gantt.epics.map((epic) => (
              <div key={epic.issueKey} className="flex border-b border-gray-100 hover:bg-slate-50/80">
                <div className="shrink-0 w-[280px] px-3 py-3 border-r border-gray-200">
                  <a
                    href={epic.issueUrl || jiraBrowseUrl(epic.issueKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-violet-700 hover:underline"
                  >
                    {epic.issueKey}
                  </a>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">{epic.summary}</div>
                </div>
                <div className="relative h-12 shrink-0" style={{ width: gridW }}>
                  {sprints.map((sp) => (
                    <div
                      key={sp}
                      className="absolute top-0 bottom-0 border-r border-gray-50"
                      style={{ left: (sp - gantt.sprintMin) * COL_W, width: COL_W }}
                    />
                  ))}
                  <div
                    className={clsx('absolute top-1/2 -translate-y-1/2 h-7 rounded-full shadow-sm')}
                    style={{
                      ...epicBarStyle(epic.startSp, epic.endSp, gantt.sprintMin),
                      backgroundColor: epic.color,
                    }}
                    title={`SP${epic.startSp}–SP${epic.endSp}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
