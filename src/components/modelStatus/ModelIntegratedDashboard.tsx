import { useMemo } from 'react'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Target, TrendingUp, TrafficCone } from 'lucide-react'
import KpiCard from '../cards/KpiCard'
import ModelStatusEventsTable from './ModelStatusEventsTable'
import ModelStatusMetaCard from './ModelStatusMetaCard'
import ManagerDashboardBody from './ManagerDashboardBody'
import ModelStatusInitiativePanel from './ModelStatusInitiativePanel'
import ModelStatusPrdPanel from './ModelStatusPrdPanel'
import ErrorBoundary from '../ErrorBoundary'
import ModelStatusReleaseEpicGantt from './ModelStatusReleaseEpicGantt'
import ModelStatusOverviewEventTimeline from './ModelStatusOverviewEventTimeline'
import {
  MODEL_STATUS_PRODUCT_GROUPS,
  MODEL_STATUS_TABS,
  type ModelStatusProductGroupId,
  type ModelStatusTabId,
} from '../../data/modelStatusCatalog'
import { isModelStatusModelDisabled } from '../../utils/modelStatusDisabled'
import { useModelStatusReleaseGantt } from '../../hooks/useModelStatusReleaseGantt'
import { useModelStatusStorySpKpi } from '../../hooks/useModelStatusStorySpKpi'
import { computeReleaseGanttKpis } from '../../utils/releaseGanttKpi'
import { MODEL_INITIATIVE_JIRA_MODELS } from '../../api/modelStatusApi'
import type { OverviewModel } from '../../types/modelScheduleOverview'
import type { ModelRow } from '../../utils/modelScheduleRows'
import { canonicalModelName } from '../../utils/modelScheduleRows'
import { normalizeOverviewCategory } from '../../utils/modelScheduleOverviewRows'
import {
  buildOverviewEventsTimeline,
  overallSignal,
  verificationIssueCounts,
  type SignalTone,
} from '../../utils/modelStatusMilestones'

function SignalBadge({ tone }: { tone: SignalTone }) {
  const cfg = {
    green: { label: 'Green', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
    amber: { label: 'Amber', dot: 'bg-amber-500', ring: 'ring-amber-200' },
    red: { label: 'Red', dot: 'bg-red-500', ring: 'ring-red-200' },
  }[tone]
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-3 h-3 rounded-full ring-4', cfg.dot, cfg.ring)} />
      <span className="text-2xl font-bold text-gray-900">{cfg.label}</span>
    </div>
  )
}

const OVERVIEW_MODEL_ALIASES: Record<string, string> = {
  SB_CH: 'CB-SH',
  CB_SH: 'CB-SH',
}

function resolveOverviewModel(models: OverviewModel[], groupId: ModelStatusProductGroupId, modelCode: string) {
  const group = MODEL_STATUS_PRODUCT_GROUPS.find((g) => g.id === groupId)
  const cat = group?.overviewCategory
  const norm = canonicalModelName(modelCode)
  const dataKey = OVERVIEW_MODEL_ALIASES[norm] ?? norm
  return (
    models.find(
      (m) =>
        canonicalModelName(m.model) === dataKey &&
        (!cat || normalizeOverviewCategory(m.category) === cat || m.category === cat),
    ) ??
    models.find((m) => canonicalModelName(m.model) === dataKey) ??
    null
  )
}

function syntheticOverview(modelCode: string, groupId: ModelStatusProductGroupId): OverviewModel {
  const group = MODEL_STATUS_PRODUCT_GROUPS.find((g) => g.id === groupId)
  return {
    id: `syn-${modelCode}`,
    category: group?.overviewCategory ?? group?.label ?? '',
    model: modelCode,
    variant: '-',
    soc: '-',
    swPm: '-',
    spec: 'overview / 검증 일정에서 메타를 불러올 예정입니다.',
    pv: '-',
    mp: '-',
    events: [],
  }
}

export interface ModelIntegratedDashboardProps {
  overviewModels: OverviewModel[]
  verificationRows: ModelRow[]
  productGroupId: ModelStatusProductGroupId
  modelCode: string
  tab: ModelStatusTabId
  onProductGroupChange: (id: ModelStatusProductGroupId) => void
  onModelChange: (code: string) => void
  onTabChange: (tab: ModelStatusTabId) => void
}

export default function ModelIntegratedDashboard({
  overviewModels,
  verificationRows,
  productGroupId,
  modelCode,
  tab,
  onProductGroupChange,
  onModelChange,
  onTabChange,
}: ModelIntegratedDashboardProps) {
  const group = MODEL_STATUS_PRODUCT_GROUPS.find((g) => g.id === productGroupId)!
  const modelList = useMemo(() => {
    if (group.models.length) return group.models
    const cat = group.overviewCategory
    if (!cat) return []
    return overviewModels
      .filter((m) => normalizeOverviewCategory(m.category) === cat)
      .map((m) => m.model)
  }, [group, overviewModels])

  const overview = useMemo(
    () => resolveOverviewModel(overviewModels, productGroupId, modelCode) ?? syntheticOverview(modelCode, productGroupId),
    [overviewModels, productGroupId, modelCode],
  )

  const jiraModelLive = MODEL_INITIATIVE_JIRA_MODELS.has(canonicalModelName(modelCode))
  const { data: releaseGanttData } = useModelStatusReleaseGantt(modelCode, jiraModelLive)
  const { data: storySpKpi } = useModelStatusStorySpKpi(modelCode, jiraModelLive)

  const eventsTimeline = useMemo(() => buildOverviewEventsTimeline(overview), [overview])
  const signal = useMemo(
    () => overallSignal(overview, verificationRows, eventsTimeline),
    [overview, verificationRows, eventsTimeline],
  )
  const issues = useMemo(() => verificationIssueCounts(overview, verificationRows), [overview, verificationRows])

  const releaseKpi = useMemo(() => {
    if (!releaseGanttData?.gantt || releaseGanttData.source !== 'jira') return null
    return computeReleaseGanttKpis(releaseGanttData.gantt)
  }, [releaseGanttData])

  const schedulePct = releaseKpi?.kpi2Pct ?? 0
  const scheduleSub =
    releaseKpi?.kpi2Sub ?? '릴리즈 · Epic 탭 Jira Milestone (모델 미연동)'
  const consumptionPct = storySpKpi?.consumptionPct
  const spPctLabel =
    consumptionPct != null && Number.isFinite(consumptionPct)
      ? `${(Math.round(consumptionPct * 10) / 10).toFixed(1)}%`
      : '—'
  const effectiveConsumed =
    storySpKpi?.effectiveSpConsumed ?? storySpKpi?.storySpConsumed ?? storySpKpi?.storySpTotal
  const consumedSourceLabel =
    storySpKpi?.consumptionPctSource === 'worklogSp'
      ? 'worklog'
      : storySpKpi?.consumptionPctSource === 'descriptionConsumedSp'
        ? '표 소모 SP'
        : 'Story SP'
  const spSub = storySpKpi?.plannedSpTotal
    ? `계획 ${storySpKpi.plannedSpTotal} SP · 소진 ${effectiveConsumed ?? 0} SP (${consumedSourceLabel}${storySpKpi.spHoursPerPoint ? ` · 1sp=${storySpKpi.spHoursPerPoint}h` : ''}) · Initiative ${storySpKpi.initiativeCount ?? storySpKpi.byInitiative?.length ?? 0}건`
    : jiraModelLive
      ? 'Initiative Description 예상 SP · Story SP — Jira 동기화 중'
      : 'Jira Initiative 라벨 미연동 모델'

  const showJiraManager = modelCode === 'S80C'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Audio 모델 통합 대시보드</h2>
        <div className="flex flex-wrap gap-2">
          {MODEL_STATUS_PRODUCT_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onProductGroupChange(g.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-semibold border transition-all',
                productGroupId === g.id
                  ? 'bg-white text-blue-700 border-blue-300 shadow-sm'
                  : 'bg-white/60 text-gray-600 border-gray-200 hover:bg-white',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modelList.map((m) => {
            const disabled = isModelStatusModelDisabled(m)
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onModelChange(m)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[11px] font-medium border',
                  disabled &&
                    'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60',
                  !disabled &&
                    (modelCode === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-200'),
                )}
                title={disabled ? '준비 중 — 추후 활성화' : undefined}
              >
                {m.replace(/_/g, ' ')}
              </button>
            )
          })}
          {!modelList.length && (
            <span className="text-xs text-gray-400 py-1">등록된 모델 없음 (overview seed 확인)</span>
          )}
        </div>
      </div>

      {eventsTimeline ? (
        <ModelStatusOverviewEventTimeline timeline={eventsTimeline} />
      ) : (overview.events?.length ?? 0) > 0 ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900">
            이벤트 타임라인을 그리지 못했습니다. 아래 HW/SW 표를 확인하세요 (FC/PV/MP 축 미사용).
          </div>
          <ModelStatusEventsTable model={overview} />
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-border bg-white p-4 text-[11px] text-gray-500">
          overview HW/SW Event 없음 — 전 모델 일정(Mongo) seed 확인
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4 border-t-[3px] border-t-emerald-600">
          <p className="text-xs font-semibold text-gray-500 mb-2">종합 상태</p>
          <SignalBadge tone={signal} />
          <p className="text-[10px] text-gray-400 mt-3 border-t pt-2">검증 Status · 마일스톤 기준 신호등</p>
        </div>
        <KpiCard
          label="KPI-2 일정 준수율"
          value={`${schedulePct}%`}
          sub={scheduleSub}
          tone={schedulePct >= 90 ? 'success' : 'warning'}
          icon={<Target size={16} />}
          trend={releaseKpi ? { value: 0, label: '릴리즈 · Epic Milestone' } : undefined}
        />
        <KpiCard
          label="KPI-1 SP 소진율"
          value={spPctLabel}
          sub={spSub}
          tone={
            consumptionPct != null && Number.isFinite(consumptionPct) && consumptionPct >= 95
              ? 'success'
              : 'info'
          }
          icon={<TrendingUp size={16} />}
          trend={
            storySpKpi
              ? {
                  value: 0,
                  label:
                    storySpKpi.consumptionPctSource === 'worklogSp'
                      ? 'Initiative Description 예상 SP 대비 worklog SP'
                      : 'Initiative Description 예상 SP 대비 소진 (worklog·Story·표)',
                }
              : undefined
          }
        />
        <KpiCard
          label="요구사항 진척 (PRD)"
          value={`${issues.prdClosed}/${issues.prdTotal} Closed`}
          sub="검증 4구분 완료·제외 집계"
          tone="default"
          icon={<CheckCircle2 size={16} />}
        />
        <KpiCard
          label="이슈 / 리스크"
          value={`${issues.open}/${issues.total || '—'}`}
          sub={`현재 Event(${eventsTimeline?.activeEventLabel ?? '-'}) · 검증 NG·지연·진행중`}
          tone={issues.open > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      <div className="border-b border-gray-200 flex gap-6 px-1">
        {MODEL_STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={clsx(
              'pb-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-4">
          <ModelStatusMetaCard model={overview} />
          <ModelStatusEventsTable model={overview} />
          {showJiraManager && (
            <div className="border border-surface-border rounded-xl bg-white p-4">
              <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrafficCone size={16} className="text-emerald-600" />
                S80C 조직 책임자 보드 (Jira)
              </p>
              <ManagerDashboardBody />
            </div>
          )}
        </div>
      )}

      {tab === 'release' && (
        <ModelStatusReleaseEpicGantt modelCode={modelCode} active={tab === 'release'} />
      )}

      {tab === 'initiative' && (
        <ModelStatusInitiativePanel
          modelCode={modelCode}
          productGroupLabel={group.label}
          active={tab === 'initiative'}
        />
      )}

      <section className={clsx(tab !== 'prd' && 'hidden')} aria-hidden={tab !== 'prd'} data-testid="model-status-prd-section">
        <ErrorBoundary title="PRD 탭 오류">
          <ModelStatusPrdPanel modelCode={modelCode} active={tab === 'prd'} />
        </ErrorBoundary>
      </section>

      {tab === 'issues' && (
        <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b text-sm font-semibold">검증 일정 이슈 (NG · 지연 · 진행중)</div>
          <div className="p-3 text-xs">
            {verificationRows
              .filter(
                (r) =>
                  canonicalModelName(r.model) === canonicalModelName(modelCode) &&
                  (r.status === 'NG' || r.status === '지연' || r.status === '진행중'),
              )
              .map((r) => (
                <div key={r.id} className="py-2 border-b border-gray-100 flex justify-between gap-2">
                  <span>
                    {r.testType} · {r.event}
                  </span>
                  <span className="font-semibold text-red-600">{r.status}</span>
                </div>
              ))}
            {!verificationRows.some(
              (r) =>
                canonicalModelName(r.model) === canonicalModelName(modelCode) &&
                (r.status === 'NG' || r.status === '지연' || r.status === '진행중'),
            ) && <p className="text-gray-400 py-4 text-center">현재 구간 open 이슈 없음</p>}
          </div>
        </div>
      )}
    </div>
  )
}
