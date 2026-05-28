import { useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, FileText, ShieldAlert } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import RiskFilters from '../components/risk/RiskFilters'
import RiskCategoryChart from '../components/risk/RiskCategoryChart'
import RiskEmvChart from '../components/risk/RiskEmvChart'
import RiskIssueTable from '../components/risk/RiskIssueTable'
import { useRiskDashboard, useRiskFilters, USE_RISK_MOCK } from '../hooks/useRiskData'
import type { RiskCategory } from '../types/risk'
import { CHART } from '../theme/colors'

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-lg-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
    if (detail) return detail
  }
  return String((error as Error).message || '데이터를 불러오지 못했습니다.')
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-lg-red bg-lg-red-light border border-red-200 rounded-lg px-4 py-3">
      <AlertCircle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function PlanFilledBar({ filled, missing, rate }: { filled: number; missing: number; rate: number }) {
  const total = filled + missing
  const filledPct = total ? (filled / total) * 100 : 0
  const missingPct = total ? (missing / total) * 100 : 0

  return (
    <div className="bg-white border border-surface-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">Description 대응 계획 입력률</p>
        <p className="text-xs text-gray-500 font-medium">{rate}%</p>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-muted">
        <div className="bg-emerald-500 transition-all" style={{ width: `${filledPct}%` }} title="입력" />
        <div className="bg-amber-400 transition-all" style={{ width: `${missingPct}%` }} title="미입력" />
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500 font-medium">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          입력 {filled}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          미입력 {missing}
        </span>
      </div>
    </div>
  )
}

export default function RiskDashboardPage() {
  const [category, setCategory] = useState<RiskCategory>('all')

  const filterParams = useMemo(() => ({ category }), [category])

  const { data: filterOptions } = useRiskFilters()
  const { data, isLoading, error } = useRiskDashboard(filterParams)

  const hasQuant = (data?.quantAnalysis?.length ?? 0) > 0
  const reserveDays = data?.meta.scheduleReserveDays ?? 45

  return (
    <>
      <Header
        title="리스크 관리"
        subtitle={
          USE_RISK_MOCK
            ? 'labels=risk · Components 범주 · Description 대응 계획 — Mock'
            : 'labels=risk · Components 범주 · Description 대응 계획 — Jira API'
        }
      />

      <div className="pt-16 p-6 space-y-6">
        <SectionCard title="범주 필터 (Components)">
          {filterOptions ? (
            <RiskFilters
              filterOptions={filterOptions}
              category={category}
              jql={data?.meta.jql}
              onCategoryChange={setCategory}
            />
          ) : (
            <LoadingBlock />
          )}
        </SectionCard>

        {error ? (
          <ErrorBlock message={getErrorMessage(error)} />
        ) : isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="리스크 (전체)" value={data.kpi.total} icon={<ShieldAlert size={16} />} />
              <KpiCard label="관리 중" value={data.kpi.open} tone="warning" />
              <KpiCard label="종료/완화" value={data.kpi.closed} tone="success" />
              <KpiCard
                label="Description 입력"
                value={`${data.kpi.planFilledPct}%`}
                tone={data.kpi.missingPlan > 0 ? 'danger' : 'success'}
                icon={<FileText size={16} />}
                sub={data.kpi.missingPlan > 0 ? `${data.kpi.missingPlan}건 미입력` : '전체 입력'}
              />
            </div>

            {data.kpi.totalEmvSchedule != null && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                  label="Σ EMV_일정"
                  value={`${data.kpi.totalEmvSchedule.toFixed(1)}일`}
                  tone="warning"
                  icon={<AlertTriangle size={16} />}
                />
                <KpiCard
                  label="Σ EMV_공수"
                  value={`${data.kpi.totalEmvEffort?.toFixed(1) ?? '—'} MD`}
                  tone="info"
                />
                <KpiCard
                  label={`Reserve (${reserveDays}일) 대비`}
                  value={`${data.kpi.reservePct ?? '—'}%`}
                  tone={(data.kpi.reservePct ?? 0) >= 80 ? 'danger' : 'warning'}
                />
              </div>
            )}

            <PlanFilledBar
              filled={data.kpi.total - data.kpi.missingPlan}
              missing={data.kpi.missingPlan}
              rate={data.kpi.planFilledPct}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="범주별 리스크 (Components)" subtitle="건수 · 미결">
                <RiskCategoryChart data={data.byCategory} />
              </SectionCard>

              {hasQuant && data.quantAnalysis && (
                <SectionCard title="EMV_일정 (기대 지연)" subtitle="정량 분석 mock · P(%) × I(일)">
                  <RiskEmvChart
                    data={data.quantAnalysis}
                    dataKey="emvSchedule"
                    suffix="일"
                    color={CHART.colors.warning}
                  />
                </SectionCard>
              )}
            </div>

            {hasQuant && data.quantAnalysis && (
              <SectionCard title="4.2 리스크 정량 분석" subtitle="EMV_일정 · EMV_공수 · 우선순위">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-surface-border bg-surface-page">
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">R-ID</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">범주</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">Key</th>
                        <th className="text-right py-3 px-4 text-xs font-bold uppercase">P(%)</th>
                        <th className="text-right py-3 px-4 text-xs font-bold uppercase">I_일정</th>
                        <th className="text-right py-3 px-4 text-xs font-bold uppercase">I_공수</th>
                        <th className="text-right py-3 px-4 text-xs font-bold uppercase">EMV_일정</th>
                        <th className="text-right py-3 px-4 text-xs font-bold uppercase">EMV_공수</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">등급</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.quantAnalysis.map((row, i) => (
                        <tr
                          key={row.riskId}
                          className={`border-b border-surface-muted ${i % 2 === 1 ? 'bg-surface-page/50' : ''}`}
                        >
                          <td className="py-3 px-4 font-semibold">{row.riskId}</td>
                          <td className="py-3 px-4">{row.category}</td>
                          <td className="py-3 px-4 font-mono text-xs text-lg-red">{row.issueKey}</td>
                          <td className="py-3 px-4 text-right">{row.pPct}%</td>
                          <td className="py-3 px-4 text-right">{row.iSchedule}일</td>
                          <td className="py-3 px-4 text-right">{row.iEffort} MD</td>
                          <td className="py-3 px-4 text-right font-semibold">{row.emvSchedule.toFixed(1)}</td>
                          <td className="py-3 px-4 text-right">{row.emvEffort.toFixed(1)}</td>
                          <td className="py-3 px-4">{row.level}</td>
                          <td className="py-3 px-4">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {data.mitigations && data.mitigations.length > 0 && (
              <SectionCard title="5. 대응 실행 현황" subtitle="목표/실제 일정 효과">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-surface-border bg-surface-page">
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">R-ID</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">전략</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">대응 조치</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">목표</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">실제/예상</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">담당</th>
                        <th className="text-left py-3 px-4 text-xs font-bold uppercase">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mitigations.map((row, i) => (
                        <tr
                          key={`${row.riskId}-${i}`}
                          className={`border-b border-surface-muted ${i % 2 === 1 ? 'bg-surface-page/50' : ''}`}
                        >
                          <td className="py-3 px-4 font-semibold">{row.riskId}</td>
                          <td className="py-3 px-4">{row.strategy}</td>
                          <td className="py-3 px-4">{row.action}</td>
                          <td className="py-3 px-4">{row.targetDays}</td>
                          <td className="py-3 px-4">{row.actualDays}</td>
                          <td className="py-3 px-4">{row.owner}</td>
                          <td className="py-3 px-4">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            <SectionCard
              title="리스크 레지스터"
              subtitle={`labels = ${data.meta.riskLabel} · 범주 = ${data.meta.categoryField} · 대응 계획 = ${data.meta.responsePlanField}`}
            >
              <RiskIssueTable issues={data.issues} />
            </SectionCard>

            {data.openIssues.length > 0 && (
              <SectionCard title="관리 중 (미완료)" subtitle={`${data.openIssues.length}건`}>
                <RiskIssueTable issues={data.openIssues} />
              </SectionCard>
            )}
          </>
        )}
      </div>
    </>
  )
}
