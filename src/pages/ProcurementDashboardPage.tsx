import { useMemo, useState } from 'react'
import { AlertCircle, ClipboardList, Package, Truck } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import ProcurementFilters from '../components/procurement/ProcurementFilters'
import ProcurementKpiGrid from '../components/procurement/ProcurementKpiGrid'
import ProcurementPipelineChart from '../components/procurement/ProcurementPipelineChart'
import {
  ProcurementAcceptanceTable,
  ProcurementMonitoringTable,
  ProcurementRequestTable,
  ProcurementScheduleTable,
  ProcurementStatusTable,
} from '../components/procurement/ProcurementTables'
import {
  useProcurementDashboard,
  useProcurementFilters,
  USE_PROCUREMENT_MOCK,
} from '../hooks/useProcurementData'
import type { ProcurementPhaseId, ProcurementVendorId } from '../types/procurement'

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-lg-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-lg-red bg-lg-red-light border border-red-200 rounded-lg px-4 py-3">
      <AlertCircle size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export default function ProcurementDashboardPage() {
  const [vendor, setVendor] = useState<ProcurementVendorId>('all')
  const [phase, setPhase] = useState<ProcurementPhaseId>('all')

  const filterParams = useMemo(() => ({ vendor, phase }), [vendor, phase])

  const { data: filterOptions } = useProcurementFilters()
  const { data, isLoading, error } = useProcurementDashboard(filterParams)

  return (
    <>
      <Header
        title="조달 KPI 대시보드"
        subtitle={
          USE_PROCUREMENT_MOCK
            ? 'Request · PROCUREMENT / Vendor_* / 단계 label — Mock 데이터'
            : 'Request · PROCUREMENT / Vendor_* / 단계 label — Jira API 연동'
        }
      />

      <div className="pt-16 p-6 space-y-6">
        <SectionCard
          title="공급자 · 단계 필터"
          subtitle="issuetype = Request · labels = PROCUREMENT · board filter JQL"
        >
          {filterOptions ? (
            <ProcurementFilters
              filterOptions={filterOptions}
              vendor={vendor}
              phase={phase}
              jql={data?.meta.jql}
              onVendorChange={setVendor}
              onPhaseChange={setPhase}
            />
          ) : (
            <LoadingBlock />
          )}
        </SectionCard>

        {error ? (
          <ErrorBlock message={String((error as Error).message || '데이터를 불러오지 못했습니다.')} />
        ) : isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="조달 Request 전체"
                value={data.summary.total}
                icon={<Package size={16} />}
              />
              <KpiCard
                label="SIGNED (체결)"
                value={data.summary.signed}
                tone="success"
                icon={<ClipboardList size={16} />}
              />
              <KpiCard
                label="VERIFIED (검증완료)"
                value={data.summary.verified}
                tone="success"
              />
              <KpiCard
                label="due date 지연"
                value={data.summary.overdue}
                tone={data.summary.overdue > 0 ? 'warning' : 'success'}
                icon={<Truck size={16} />}
              />
            </div>

            <SectionCard
              title="4.2 조달 KPI — 목표 vs 실적"
              subtitle={`기준일 ${data.meta.asOf} · 각 KPI 산출식 표시`}
            >
              <ProcurementKpiGrid kpis={data.kpis} />
            </SectionCard>

            <SectionCard title="4.1 조달 현황" subtitle="공급자 · 계약 label · 진행 · 산출물">
              <ProcurementStatusTable rows={data.statusItems} />
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="3.1 조달 수행 단계" subtitle="label 기준 Request 건수">
                <ProcurementPipelineChart data={data.pipeline} />
              </SectionCard>

              <SectionCard title="3.2 조달 수행 일정" subtitle="계획 vs 마일스톤 vs 현재">
                <ProcurementScheduleTable rows={data.schedule} />
              </SectionCard>
            </div>

            <SectionCard title="5. 인도 검수 계획" subtitle="인도 기준 · 검수 방법 · VERIFIED Task 비율">
              <ProcurementAcceptanceTable rows={data.acceptance} />
            </SectionCard>

            <SectionCard title="5.1 정기 모니터링 기록" subtitle="일정 · 품질 판정 이력">
              <ProcurementMonitoringTable rows={data.monitoring} />
            </SectionCard>

            <SectionCard
              title="조달 Request Task 목록"
              subtitle="due date 지연 · CONTRACT 미체결 건 행 강조 · Key 클릭 시 Jira 새 탭"
            >
              <ProcurementRequestTable rows={data.requests} />
            </SectionCard>
          </>
        )}
      </div>
    </>
  )
}
