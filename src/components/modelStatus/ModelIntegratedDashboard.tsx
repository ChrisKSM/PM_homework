import { useMemo } from 'react'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Target, TrendingUp, TrafficCone } from 'lucide-react'
import KpiCard from '../cards/KpiCard'
import ModelStatusEventsTable from './ModelStatusEventsTable'
import ModelStatusMetaCard from './ModelStatusMetaCard'
import ManagerDashboardBody from './ManagerDashboardBody'
import ModelStatusInitiativePanel from './ModelStatusInitiativePanel'
import {
  MODEL_STATUS_PRODUCT_GROUPS,
  MODEL_STATUS_TABS,
  type ModelStatusProductGroupId,
  type ModelStatusTabId,
} from '../../data/modelStatusCatalog'
import type { OverviewModel } from '../../types/modelScheduleOverview'
import type { ModelRow } from '../../utils/modelScheduleRows'
import { canonicalModelName } from '../../utils/modelScheduleRows'
import { normalizeOverviewCategory } from '../../utils/modelScheduleOverviewRows'
import {
  buildMilestoneTimeline,
  fmtShortDate,
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

function phaseColor(phase: string) {
  if (phase === 'FC') return 'from-emerald-500 to-emerald-600'
  if (phase === 'PV') return 'from-blue-500 to-blue-600'
  return 'from-orange-500 to-orange-600'
}

function resolveOverviewModel(models: OverviewModel[], groupId: ModelStatusProductGroupId, modelCode: string) {
  const group = MODEL_STATUS_PRODUCT_GROUPS.find((g) => g.id === groupId)
  const cat = group?.overviewCategory
  const norm = canonicalModelName(modelCode)
  return (
    models.find(
      (m) =>
        canonicalModelName(m.model) === norm &&
        (!cat || normalizeOverviewCategory(m.category) === cat || m.category === cat),
    ) ??
    models.find((m) => canonicalModelName(m.model) === norm) ??
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

  const timeline = useMemo(
    () => buildMilestoneTimeline(overview, verificationRows),
    [overview, verificationRows],
  )
  const signal = useMemo(
    () => overallSignal(overview, verificationRows, timeline),
    [overview, verificationRows, timeline],
  )
  const issues = useMemo(() => verificationIssueCounts(overview, verificationRows), [overview, verificationRows])

  const milestoneDone = timeline.segments.filter((s) => timeline.today > s.end).length
  const milestoneTotal = timeline.segments.length
  const schedulePct = Math.round((milestoneDone / milestoneTotal) * 100)
  const spDone = issues.closed * 10 + 20
  const spTotal = Math.max(issues.total * 10, 424)
  const spPct = Math.min(100, Math.round((spDone / spTotal) * 1000) / 10)

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
          {modelList.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModelChange(m)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[11px] font-medium border',
                modelCode === m
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-200',
              )}
            >
              {m.replace(/_/g, ' ')}
            </button>
          ))}
          {!modelList.length && (
            <span className="text-xs text-gray-400 py-1">등록된 모델 없음 (overview seed 확인)</span>
          )}
        </div>
      </div>

      <div className="relative rounded-2xl border border-surface-border bg-white p-4 overflow-hidden">
        <div className="flex h-14 rounded-xl overflow-hidden shadow-inner">
          {timeline.segments.map((seg) => (
            <div
              key={seg.phase}
              className={clsx(
                'flex-1 flex flex-col justify-center px-3 text-white bg-gradient-to-r relative',
                phaseColor(seg.phase),
              )}
              style={{
                clipPath: seg.phase === 'MP' ? undefined : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
              }}
            >
              <span className="text-xs font-bold tracking-wide">{seg.label}</span>
              <span className="text-[10px] opacity-90">
                {fmtShortDate(seg.start)} — {fmtShortDate(seg.end)}
              </span>
            </div>
          ))}
        </div>
        <div
          className="absolute top-4 bottom-4 w-0.5 bg-violet-600 z-10 pointer-events-none"
          style={{ left: `calc(16px + (100% - 32px) * ${timeline.todayRatio})` }}
          title="오늘"
        />
        <p className="text-[10px] text-gray-500 mt-2">
          현재 단계: <b>{timeline.activePhase ?? '—'}</b> · HW/SW Event는 overview · 검증 일정 바 라벨(FC/PV/MP) 반영
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4 border-t-[3px] border-t-emerald-600">
          <p className="text-xs font-semibold text-gray-500 mb-2">종합 상태</p>
          <SignalBadge tone={signal} />
          <p className="text-[10px] text-gray-400 mt-3 border-t pt-2">검증 Status · 마일스톤 기준 신호등</p>
        </div>
        <KpiCard
          label="KPI-2 일정 준수율"
          value={`${schedulePct}% ▶`}
          sub={`마일스톤 ${milestoneDone}/${milestoneTotal} 정시`}
          tone={schedulePct >= 90 ? 'success' : 'warning'}
          icon={<Target size={16} />}
          trend={{ value: 5, label: '추세 일정 유지' }}
        />
        <KpiCard
          label="KPI-1 작업 완료율"
          value={`${spPct}% ▲`}
          sub={`${spDone}/${spTotal} SP`}
          tone={spPct >= 95 ? 'success' : 'info'}
          icon={<TrendingUp size={16} />}
          trend={{ value: 8, label: '목표 ≥95%' }}
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
          sub={`현재 Event(${timeline.activePhase ?? '-'}) 구간 NG·지연·진행중`}
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

      {tab === 'initiative' && (
        <ModelStatusInitiativePanel
          modelCode={modelCode}
          productGroupLabel={group.label}
          active={tab === 'initiative'}
        />
      )}

      {tab === 'prd' && (
        <div className="rounded-xl border border-surface-border bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">PRD 요구사항</h3>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
            <li>Closed {issues.prdClosed} / {issues.prdTotal} (검증 일정 Status 기준 proxy)</li>
            <li>{overview.spec || '스펙 — overview A~H 열'}</li>
          </ul>
        </div>
      )}

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
