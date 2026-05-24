import type { QualityDashboard, QualityFilterOptions } from '../types/quality'

export const MOCK_QUALITY_FILTERS: QualityFilterOptions = {
  eventGroups: [
    { value: 'DEV', label: 'DEV' },
    { value: 'FC', label: 'FC' },
    { value: 'PV', label: 'PV' },
    { value: 'AUTO', label: '자동화' },
  ],
  phases: {
    DEV: [
      { phase: '1', label: 'DEV 1차', jiraLabel: 'DEV1_BUG' },
      { phase: '2', label: 'DEV 2차', jiraLabel: 'DEV2_BUG' },
      { phase: '3', label: 'DEV 3차', jiraLabel: 'DEV3_BUG' },
    ],
    FC: [
      { phase: '1', label: 'FC 1차', jiraLabel: 'FC1_BUG' },
      { phase: '2', label: 'FC 2차', jiraLabel: 'FC2_BUG' },
      { phase: '3', label: 'FC 3차', jiraLabel: 'FC3_BUG' },
      { phase: '4', label: 'FC 4차', jiraLabel: 'FC4_BUG' },
    ],
    PV: [
      { phase: '1', label: 'PV 1차', jiraLabel: 'PV1' },
      { phase: '2', label: 'PV 2차', jiraLabel: 'PV2' },
      { phase: '3', label: 'PV 3차', jiraLabel: 'PV3' },
      { phase: '4', label: 'PV 4차', jiraLabel: 'PV4' },
    ],
    AUTO: [
      { phase: '1', label: '자동화 1차', jiraLabel: 'Auto1' },
      { phase: '2', label: '자동화 2차', jiraLabel: 'Auto2' },
    ],
  },
}

const BASE_MOCK: QualityDashboard = {
  meta: {
    event: 'DEV',
    phase: '1',
    phaseLabel: 'DEV 1차',
    jiraLabel: 'DEV1_BUG',
    jql: 'issuetype = Bug AND labels = "DEV1_BUG"',
    categoryFilter: 'all',
  },
  kpi: {
    discovered: 47,
    resolved: 38,
    open: 9,
    p1p2Open: 3,
    resolveRatePct: 81,
  },
  agingKpi: {
    avgResolveDays: 3.6,
    medianResolveDays: 3,
    avgOpenAgeDays: 5.2,
    p1p2AvgResolveDays: 2.4,
  },
  byPriority: [
    { priority: 'P0', discovered: 2, resolved: 2, open: 0 },
    { priority: 'P1', discovered: 8, resolved: 6, open: 2 },
    { priority: 'P2', discovered: 15, resolved: 12, open: 3 },
    { priority: 'P3', discovered: 22, resolved: 18, open: 4 },
  ],
  byCategory: [
    { category: 'Bug', count: 31 },
    { category: 'Function', count: 12 },
    { category: 'Auto', count: 4 },
  ],
  resolveAgingBuckets: [
    { label: '0–1일', count: 9 },
    { label: '2–3일', count: 14 },
    { label: '4–7일', count: 10 },
    { label: '8–14일', count: 4 },
    { label: '15일+', count: 1 },
  ],
  openAgingBuckets: [
    { label: '0–1일', count: 1 },
    { label: '2–3일', count: 3 },
    { label: '4–7일', count: 3 },
    { label: '8–14일', count: 1 },
    { label: '15일+', count: 1 },
  ],
  avgResolveByPriority: [
    { priority: 'P0', days: 0.5 },
    { priority: 'P1', days: 2.8 },
    { priority: 'P2', days: 5.1 },
    { priority: 'P3', days: 8.4 },
  ],
  p1p2OpenIssues: [
    {
      issueKey: 'PROJ-882',
      priority: 'P1',
      category: 'Function',
      summary: '결제 콜백 타임아웃',
      status: 'In Progress',
      assignee: 'kim.lg',
      ageDays: 4,
      responsePlan: '3/25 Hotfix 배포',
      responseAction: 'RCA 후 패치',
      missingPlan: false,
    },
    {
      issueKey: 'PROJ-901',
      priority: 'P1',
      category: 'Bug',
      summary: '로그인 세션 만료 오류',
      status: 'Open',
      assignee: 'lee.lg',
      ageDays: 2,
      responsePlan: '3/26 RC 재현 후 패치',
      responseAction: null,
      missingPlan: false,
    },
    {
      issueKey: 'PROJ-915',
      priority: 'P2',
      category: 'Bug',
      summary: '설정 화면 레이아웃 깨짐',
      status: 'Open',
      assignee: 'park.lg',
      ageDays: 3,
      responsePlan: null,
      responseAction: null,
      missingPlan: true,
    },
  ],
  openIssues: [
    {
      issueKey: 'PROJ-882',
      priority: 'P1',
      category: 'Function',
      summary: '결제 콜백 타임아웃',
      status: 'In Progress',
      assignee: 'kim.lg',
      ageDays: 4,
      responsePlan: '3/25 Hotfix 배포',
      responseAction: 'RCA 후 패치',
    },
    {
      issueKey: 'PROJ-901',
      priority: 'P1',
      category: 'Bug',
      summary: '로그인 세션 만료 오류',
      status: 'Open',
      assignee: 'lee.lg',
      ageDays: 2,
      responsePlan: '3/26 RC 재현 후 패치',
      responseAction: null,
    },
    {
      issueKey: 'PROJ-915',
      priority: 'P2',
      category: 'Bug',
      summary: '설정 화면 레이아웃 깨짐',
      status: 'Open',
      assignee: 'park.lg',
      ageDays: 3,
      responsePlan: '4/1 Sprint 12 포함',
      responseAction: 'UI hotfix',
    },
    {
      issueKey: 'PROJ-920',
      priority: 'P3',
      category: 'Bug',
      summary: '툴팁 문구 오타',
      status: 'Open',
      assignee: 'kim.lg',
      ageDays: 5,
      responsePlan: null,
      responseAction: null,
    },
    {
      issueKey: 'PROJ-921',
      priority: 'P2',
      category: 'Function',
      summary: '음성 안내 지연',
      status: 'In Progress',
      assignee: 'lee.lg',
      ageDays: 2,
      responsePlan: null,
      responseAction: 'FW 패치 검토',
    },
  ],
}

export function getMockQualityDashboard(
  event = 'DEV',
  phase = '1',
  category = 'all'
): QualityDashboard {
  const phases = MOCK_QUALITY_FILTERS.phases[event as keyof typeof MOCK_QUALITY_FILTERS.phases]
  const phaseInfo = phases?.find((p) => p.phase === phase) ?? phases?.[0]

  let data: QualityDashboard = {
    ...BASE_MOCK,
    meta: {
      ...BASE_MOCK.meta,
      event,
      phase,
      phaseLabel: phaseInfo?.label ?? `${event} ${phase}차`,
      jiraLabel: phaseInfo?.jiraLabel ?? `${event}${phase}_BUG`,
      jql: `issuetype = Bug AND labels = "${phaseInfo?.jiraLabel ?? ''}"`,
      categoryFilter: category,
    },
  }

  if (category !== 'all') {
    const catMap: Record<string, string> = {
      bug: 'Bug',
      function: 'Function',
      auto: 'Auto',
    }
    const target = catMap[category]
    data = {
      ...data,
      byCategory: data.byCategory.map((row) =>
        row.category === target ? row : { ...row, count: 0 }
      ),
      p1p2OpenIssues: data.p1p2OpenIssues.filter((r) => r.category === target),
      openIssues: data.openIssues.filter((r) => r.category === target),
    }
  }

  return data
}
