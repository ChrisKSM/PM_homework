import { useMemo, useState } from 'react'
import { AlertCircle, GitBranch } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import BeforeAfterCard from '../components/planning/BeforeAfterCard'
import ComplianceChecklist from '../components/planning/ComplianceChecklist'
import HierarchyTree from '../components/planning/HierarchyTree'
import TraceabilityMatrix from '../components/planning/TraceabilityMatrix'
import StoryDetailDrawer from '../components/planning/StoryDetailDrawer'
import PlanningFilters from '../components/planning/PlanningFilters'
import PlanningDebugStrip from '../components/planning/PlanningDebugStrip'
import {
  usePlanningCompliance,
  usePlanningFilters,
  usePlanningHierarchy,
  usePlanningTraceability,
  useStoryDetail,
  USE_PLANNING_MOCK,
} from '../hooks/usePlanningData'

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

export default function PlanningTraceabilityPage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [gateFilter, setGateFilter] = useState('all')
  const [sprintFilter, setSprintFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filterParams = useMemo(
    () => ({ gate: gateFilter, sprint: sprintFilter, status: statusFilter }),
    [gateFilter, sprintFilter, statusFilter]
  )

  const { data: filterOptions, isLoading: loadingFilters } = usePlanningFilters()
  const { data: compliance, isLoading: loadingCompliance, error: complianceError } = usePlanningCompliance()
  const { data: hierarchy, isLoading: loadingHierarchy, error: hierarchyError } = usePlanningHierarchy(filterParams)
  const { data: traceabilityData, isLoading: loadingTraceability, error: traceabilityError } =
    usePlanningTraceability(filterParams)
  const { data: storyDetail, isLoading: loadingStory } = useStoryDetail(selectedKey)

  const gates = filterOptions?.gates ?? []
  const sprints = filterOptions?.sprints ?? []
  const loadingMain = loadingCompliance || loadingHierarchy || loadingTraceability

  return (
    <>
      <Header
        title="3계층 계획 구조 및 요구사항 추적성"
        subtitle={
          USE_PLANNING_MOCK
            ? 'Release(Gate) → Sprint → Epic → Story — Mock 데이터'
            : 'Release(Gate) → Sprint → Epic → Story — Jira API 연동'
        }
      />

      <div className="pt-16 p-6 space-y-6">
        <div className="bg-lg-red-light border border-red-200 rounded-xl px-5 py-4">
          <p className="text-sm text-gray-800 leading-relaxed">
            본 프로젝트는 Release(Gate) – Sprint(단계) – Epic – Story(Task)의 계층 구조로 계획되었으며,
            각 계층마다 목표(Goal)와 완료 기준(Exit Criteria / DoD / AC)을 정의하였다.
          </p>
        </div>

        <PlanningDebugStrip
          complianceMeta={
            compliance?.meta
              ? {
                  totalStories: compliance.meta.totalStories,
                  linkedStories: compliance.meta.linkedStories,
                  sprintCount: compliance.meta.sprintCount,
                }
              : undefined
          }
          apiError={!!complianceError}
        />

        {complianceError ? (
          <ErrorBlock message="Compliance 데이터를 불러오지 못했습니다. Jira API 연결을 확인하세요." />
        ) : loadingCompliance || !compliance ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white border border-surface-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="계층 연결률"
              value={`${compliance.hierarchyLinkedPct}%`}
              sub="Gate–Sprint–Epic–Story"
              tone="warning"
            />
            <KpiCard
              label="AC 충족 Story"
              value={`${compliance.acCompletePct}%`}
              sub="Given-When-Then 3개+"
              tone="warning"
            />
            <KpiCard
              label="Sprint Goal 작성"
              value={`${compliance.sprintGoalPct}%`}
              sub="1문장 목표"
              tone="success"
              icon={<GitBranch size={16} />}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Before / After" subtitle="지적사항 → 개선 (심사용)">
            <BeforeAfterCard />
          </SectionCard>
          <SectionCard title="보완 체크리스트" subtitle="최종 산출물 보완 항목">
            {loadingCompliance || !compliance ? <LoadingBlock /> : <ComplianceChecklist items={compliance.checklist} />}
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            <SectionCard title="필터" subtitle="Gate · Sprint · AC/DoD">
              <PlanningFilters
                gate={gateFilter}
                sprint={sprintFilter}
                status={statusFilter}
                gates={gates}
                sprints={sprints}
                jql={traceabilityData?.meta?.jql ?? filterOptions?.meta?.jql}
                loading={loadingFilters}
                useMock={USE_PLANNING_MOCK}
                onGateChange={setGateFilter}
                onSprintChange={setSprintFilter}
                onStatusChange={setStatusFilter}
              />
            </SectionCard>
          </div>
          <div className="lg:col-span-9">
            <SectionCard
              title="계층 트리"
              subtitle="L1 Release → L2 Sprint → L3 Epic → L4 Story · Story 클릭 시 상세"
            >
              {hierarchyError ? (
                <ErrorBlock message="계층 트리를 불러오지 못했습니다." />
              ) : loadingHierarchy ? (
                <LoadingBlock />
              ) : (
                <HierarchyTree
                  nodes={hierarchy ?? []}
                  selectedKey={selectedKey}
                  onSelectStory={setSelectedKey}
                />
              )}
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="추적성 매트릭스"
          subtitle={
            traceabilityData?.meta?.jql
              ? `Story only · ${traceabilityData.meta.jql}`
              : 'Story × Gate · Sprint · Epic · AC · DoD · 우선순위 근거'
          }
        >
          {traceabilityError ? (
            <ErrorBlock message="추적성 매트릭스를 불러오지 못했습니다." />
          ) : loadingTraceability ? (
            <LoadingBlock />
          ) : (
            <TraceabilityMatrix
              rows={traceabilityData?.rows ?? []}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
          )}
        </SectionCard>

        {loadingMain && (
          <p className="text-xs text-gray-400 text-center">Jira 데이터 동기화 중…</p>
        )}
      </div>

      <StoryDetailDrawer
        detail={loadingStory ? null : storyDetail ?? null}
        onClose={() => setSelectedKey(null)}
      />
    </>
  )
}
