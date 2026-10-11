import { useMemo } from 'react'
import clsx from 'clsx'
import { ExternalLink, Loader2, Target, TrendingUp } from 'lucide-react'
import { useModelStatusInitiatives } from '../../hooks/useModelStatusInitiatives'
import { useModelStatusReleaseGantt } from '../../hooks/useModelStatusReleaseGantt'
import type { ModelReleaseGanttData, ReleaseMilestone } from '../../types/modelStatusReleaseGantt'
import { jiraBrowseUrl } from '../../utils/jiraBrowseUrl'
import {
  computeReleaseGanttKpis,
  filterEpicsWithMilestones,
  todayLineOffsetPx,
} from '../../utils/releaseGanttKpi'

const COL_W = 56
const LABEL_W = 280

interface Props {
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
  return { left, width: Math.max(width, 20) }
}

function milestonesForSprint(milestones: ReleaseMilestone[], sp: number) {
  return milestones.filter((m) => m.sprint === sp)
}

export default function ModelStatusReleaseEpicGantt({ modelCode, active }: Props) {
  const { data: initData } = useModelStatusInitiatives(modelCode, active)
  const primaryInitiativeKey = initData?.issues?.[0]?.key
  const { data: releaseData, isLoading, isFetching } = useModelStatusReleaseGantt(
    modelCode,
    active,
    primaryInitiativeKey,
  )

  const rawGantt: ModelReleaseGanttData = releaseData?.gantt ?? {
    sprintMin: 1,
    sprintMax: 26,
    irBands: [],
    milestones: [],
    epics: [],
  }

  const gantt = useMemo(() => filterEpicsWithMilestones(rawGantt), [rawGantt])
  const kpis = useMemo(() => computeReleaseGanttKpis(rawGantt), [rawGantt])
  const todayPx = useMemo(() => todayLineOffsetPx(gantt, COL_W), [gantt])

  const sprints = useMemo(
    () => sprintRange(gantt.sprintMin, gantt.sprintMax),
    [gantt.sprintMin, gantt.sprintMax],
  )
  const sprintMeta = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of gantt.sprints ?? []) {
      map.set(s.sp, s.label)
    }
    return map
  }, [gantt.sprints])

  const gridW = sprints.length * COL_W
  const initiative = releaseData?.initiative ?? initData?.issues?.[0] ?? null
  const source = releaseData?.source ?? 'mock'
  const metaErrors = releaseData?.meta?.errors ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">KPI-1 SP 경과율</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.kpi1Pct}%</p>
              <p className="text-xs text-gray-600 mt-1">{kpis.kpi1Sub}</p>
              <p className="text-[10px] text-gray-400 mt-2">{kpis.kpi1Detail}</p>
            </div>
            <TrendingUp className="text-blue-500 shrink-0" size={28} />
          </div>
        </div>
        <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-violet-800 uppercase tracking-wide">KPI-2 마일스톤 완료율</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.kpi2Pct}%</p>
              <p className="text-xs text-gray-600 mt-1">{kpis.kpi2Sub}</p>
              <p className="text-[10px] text-gray-400 mt-2">{kpis.kpi2Detail}</p>
            </div>
            <Target className="text-violet-500 shrink-0" size={28} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">릴리즈 Gantt · Milestone Epic</h3>
            <p className="text-[11px] text-gray-500">
              Milestone 보유 Epic만 · issuetype=Milestone
              {source === 'jira' ? (
                <span className="ml-1 text-emerald-600 font-medium">
                  · Epic {gantt.epics.length} · Milestone {gantt.milestones.length}
                </span>
              ) : (
                <span className="ml-1 text-amber-600">· mock</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {(isLoading || isFetching) && <Loader2 className="animate-spin text-violet-500" size={14} />}
            <span className="text-red-600 font-medium">| 오늘</span>
          </div>
        </div>

        {metaErrors.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-800">
            Jira 일부 조회 실패: {metaErrors.slice(0, 2).join(' · ')}
          </div>
        )}

        <div className="px-4 py-2 bg-slate-50 border-b border-surface-border text-[11px]">
          <span className="font-semibold text-gray-500 mr-2">Initiative</span>
          {initiative ? (
            <a
              href={initiative.issueUrl || jiraBrowseUrl('key' in initiative ? initiative.key : '')}
              target="_blank"
              rel="noreferrer"
              className="text-violet-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              {initiative.key} · {initiative.summary.slice(0, 48)}
              {initiative.summary.length > 48 ? '…' : ''}
              <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-gray-400">({modelCode} — Initiative 탭)</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="relative" style={{ minWidth: LABEL_W + gridW }}>
            {todayPx != null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none opacity-90"
                style={{ left: LABEL_W + todayPx }}
                title="오늘"
              />
            )}

            <div className="flex border-b border-gray-200 bg-gray-50">
              <div
                className="shrink-0 px-3 py-2 text-[10px] font-bold text-gray-600 border-r border-gray-200"
                style={{ width: LABEL_W }}
              >
                EPIC (Milestone 있음)
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

            <div className="flex border-b border-gray-200">
              <div
                className="shrink-0 border-r border-gray-200 px-2 py-1 text-[9px] text-gray-500"
                style={{ width: LABEL_W }}
              >
                Sprint · Milestone
              </div>
              <div className="flex relative" style={{ width: gridW }}>
                {sprints.map((sp) => {
                  const msList = milestonesForSprint(gantt.milestones, sp)
                  const tip = sprintMeta.get(sp) ?? `SP${String(sp).padStart(2, '0')}`
                  return (
                    <div
                      key={sp}
                      className="shrink-0 border-r border-gray-100 text-center py-1 relative"
                      style={{ width: COL_W }}
                      title={tip}
                    >
                      <div className="text-[9px] font-semibold text-gray-700">SP{String(sp).padStart(2, '0')}</div>
                      <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 min-h-[14px]">
                        {msList.map((ms) => (
                          <span
                            key={ms.issueKey}
                            className="px-1 py-0 rounded text-[8px] font-bold bg-violet-600 text-white leading-tight"
                            title={`${ms.summary ?? ms.label}${ms.status ? ` · ${ms.status}` : ''}`}
                          >
                            {ms.label.length > 6 ? `${ms.label.slice(0, 5)}…` : ms.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {gantt.epics.length === 0 && (
              <div className="px-4 py-6 text-center text-[11px] text-gray-500 space-y-1">
                <p>Milestone이 연결된 Epic이 없습니다.</p>
                <p className="text-gray-400">Jira Milestone issuetype · Epic 하위/링크 확인</p>
              </div>
            )}

            {gantt.epics.map((epic) => (
              <div key={epic.issueKey} className="flex border-b border-gray-100 hover:bg-slate-50/80">
                <div className="shrink-0 px-3 py-3 border-r border-gray-200" style={{ width: LABEL_W }}>
                  <a
                    href={epic.issueUrl || jiraBrowseUrl(epic.issueKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-violet-700 hover:underline"
                  >
                    {epic.issueKey}
                  </a>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">{epic.summary}</div>
                  <div className="text-[9px] text-violet-600 mt-1">
                    Milestone {(epic.milestones ?? []).length}건
                  </div>
                </div>
                <div className="relative h-14 shrink-0" style={{ width: gridW }}>
                  {sprints.map((sp) => (
                    <div
                      key={sp}
                      className="absolute top-0 bottom-0 border-r border-gray-50"
                      style={{ left: (sp - gantt.sprintMin) * COL_W, width: COL_W }}
                    />
                  ))}
                  <div
                    className={clsx('absolute top-1/2 -translate-y-1/2 h-6 rounded-full shadow-sm opacity-90')}
                    style={{
                      ...epicBarStyle(epic.startSp, epic.endSp, gantt.sprintMin),
                      backgroundColor: epic.color,
                    }}
                    title={`SP${String(epic.startSp).padStart(2, '0')}–SP${String(epic.endSp).padStart(2, '0')}`}
                  />
                  {(epic.milestones ?? []).map((ms) => (
                    <a
                      key={ms.issueKey}
                      href={ms.issueUrl || jiraBrowseUrl(ms.issueKey)}
                      target="_blank"
                      rel="noreferrer"
                      className={clsx(
                        'absolute top-1/2 -translate-y-1/2 z-10 px-1 py-0.5 rounded-sm text-[8px] font-bold border shadow-sm hover:bg-violet-50',
                        ms.status?.toLowerCase().includes('done') ||
                          ms.status?.toLowerCase().includes('closed')
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-violet-500 text-violet-800',
                      )}
                      style={{
                        left: (ms.sprint - gantt.sprintMin) * COL_W + COL_W / 2 - 10,
                      }}
                      title={`${ms.summary ?? ms.label}${ms.status ? ` · ${ms.status}` : ''}`}
                    >
                      {ms.label.length > 4 ? ms.label.slice(0, 3) : ms.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
