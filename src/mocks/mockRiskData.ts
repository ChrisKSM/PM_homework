import type {
  RiskCategory,
  RiskDashboard,
  RiskEmvTrend,
  RiskFilterOptions,
  RiskMitigationRow,
  RiskQuantRow,
  RiskStatusChangeRow,
} from '../types/risk'

export const MOCK_RISK_FILTERS: RiskFilterOptions = {
  categories: [
    { value: 'all', label: '전체' },
    { value: '요구사항', label: '요구사항' },
    { value: '일정', label: '일정' },
    { value: '자원', label: '자원' },
    { value: '기술', label: '기술' },
    { value: '외부의존', label: '외부의존' },
    { value: '품질', label: '품질' },
    { value: '범위', label: '범위' },
    { value: '미지정', label: '미지정' },
  ],
  riskLabel: 'risk',
  categoryField: 'components',
  responsePlanField: 'description',
  emvField: 'environment',
}

/** Jira Environment 필드 입력 템플릿 (Wiki markup · 불릿 · 갱신 줄) */
export const RISK_ENVIRONMENT_TEMPLATE = `R-ID : R-02

*{color:red}Risk Score : 3(P) X 3(I) = 9{color}*

EMV
- P(%) : 50
- I_일정(일) : 12
- I_공수(MD) : 15
- EMV 일정 : 6.0
- EMV 공수 : 7.5

R-02 | 변경 전: 50% / 12일 | 변경 후: 40% / 10일 | Δ EMV_일정: −2.0일 | 레벨링 완료 → 완화됨
R-02 | 변경 전: 40% / 10일 | 변경 후: 40% / 8일 | Δ EMV_일정: −0.8일 | CCB 진행 PP단계 요구사항 인입`

const BROWSE = 'https://harmony.lge.com:8443/issue/browse'
const RESERVE_DAYS = 45

/** Canvas mock(risk-dashboard-mock)과 동일 — P(%) × I → EMV */
export const MOCK_QUANT: RiskQuantRow[] = [
  {
    riskId: 'R-01',
    category: '요구사항',
    issueKey: 'MLCSIXZERO-401',
    title: 'Sprint 중 신규 요구사항 인입으로 일정 지연 가능성',
    pPct: 60,
    iSchedule: 14,
    iEffort: 20,
    emvSchedule: 8.4,
    emvEffort: 12.0,
    qualScore: 9,
    level: '매우 높음',
    priority: 1,
    strategy: '완화',
    owner: 'PM',
    status: '관리 중',
  },
  {
    riskId: 'R-02',
    category: '일정',
    issueKey: 'MLCSIXZERO-402',
    title: '핵심 기능 개발 지연으로 Sprint 목표 미달 가능성',
    pPct: 50,
    iSchedule: 12,
    iEffort: 15,
    emvSchedule: 6.0,
    emvEffort: 7.5,
    qualScore: 9,
    level: '높음',
    priority: 2,
    strategy: '완화',
    owner: 'PL',
    status: '관리 중',
  },
  {
    riskId: 'R-03',
    category: '자원',
    issueKey: 'MLCSIXZERO-403',
    title: '특정 핵심 인력 집중으로 인한 과부하 발생 가능성',
    pPct: 50,
    iSchedule: 12,
    iEffort: 15,
    emvSchedule: 6.0,
    emvEffort: 7.5,
    qualScore: 6,
    level: '높음',
    priority: 3,
    strategy: '완화',
    owner: 'PM',
    status: '완화됨',
  },
  {
    riskId: 'R-04',
    category: '기술',
    issueKey: 'MLCSIXZERO-401',
    title: '신규 기능 통합 시 예기치 않은 버그 발생 가능성',
    pPct: 50,
    iSchedule: 8,
    iEffort: 10,
    emvSchedule: 4.0,
    emvEffort: 5.0,
    qualScore: 4,
    level: '중간',
    priority: 4,
    strategy: '완화',
    owner: 'Dev Lead',
    status: '관리 중',
  },
  {
    riskId: 'R-05',
    category: '외부의존',
    issueKey: 'MLCSIXZERO-404',
    title: '타 부서/외부 시스템 연동 일정 변동 가능성',
    pPct: 50,
    iSchedule: 14,
    iEffort: 10,
    emvSchedule: 7.0,
    emvEffort: 5.0,
    qualScore: 4,
    level: '중간',
    priority: 5,
    strategy: '회피',
    owner: 'PM',
    status: '관리 중',
  },
  {
    riskId: 'R-06',
    category: '품질',
    issueKey: 'MLCSIXZERO-405',
    title: '검증 단계 누적으로 테스트 일정 부족 가능성',
    pPct: 30,
    iSchedule: 8,
    iEffort: 12,
    emvSchedule: 2.4,
    emvEffort: 3.6,
    qualScore: 2,
    level: '낮음',
    priority: 7,
    strategy: '완화',
    owner: 'QA',
    status: '관리 중',
  },
  {
    riskId: 'R-07',
    category: '범위',
    issueKey: 'MLCSIXZERO-406',
    title: '범위 정의 불충분으로 재작업 발생 가능성',
    pPct: 50,
    iSchedule: 6,
    iEffort: 8,
    emvSchedule: 3.0,
    emvEffort: 4.0,
    qualScore: 4,
    level: '중간',
    priority: 6,
    strategy: '회피',
    owner: 'PM',
    status: '종료',
  },
]

/** Sprint 11 종료 기준 — SP8~10 고정, SP11 Σ EMV + R-02 갱신(−2.0, −0.8)만 mitigated 반영 */
const SP10_MITIGATED = 6.5
const R02_SP11_MITIGATED = 2.8

export const MOCK_STATUS_CHANGES: RiskStatusChangeRow[] = [
  {
    riskId: 'R-02',
    category: '일정',
    issueKey: 'MLCSIXZERO-402',
    beforePI: '50% / 12일',
    afterPI: '40% / 10일',
    deltaEmvSchedule: '−2.0일',
    note: '레벨링 완료 → 완화됨',
  },
  {
    riskId: 'R-02',
    category: '일정',
    issueKey: 'MLCSIXZERO-402',
    beforePI: '40% / 10일',
    afterPI: '40% / 8일',
    deltaEmvSchedule: '−0.8일',
    note: 'CCB 진행 PP단계 요구사항 인입',
  },
]

export const MOCK_MITIGATIONS: RiskMitigationRow[] = [
  { riskId: 'R-01', strategy: '완화', action: '변경 영향도 분석 · CCB 승인', targetDays: '−6일', actualDays: '−4일 (진행)', owner: 'PM', status: '관리 중' },
  { riskId: 'R-01', strategy: '완화', action: 'HDMI 모듈 사전 통합 테스트', targetDays: '−3일', actualDays: '−2일 (완료)', owner: 'System', status: '2026.04.26' },
  { riskId: 'R-02', strategy: '완화', action: '기능 단위 우선순위 재조정', targetDays: '−5일', actualDays: '−3일 (진행)', owner: 'PL', status: '관리 중' },
  { riskId: 'R-03', strategy: '완화', action: '작업 분산 · 일정 레벨링', targetDays: '−8일', actualDays: '−6일 (완료)', owner: 'PM', status: '완화됨' },
  { riskId: 'R-05', strategy: '회피', action: 'TV 일정 조율 · 영향 범위 제한', targetDays: '−10일', actualDays: '−8일 (진행)', owner: '외부 협력사', status: '2026.05.02' },
  { riskId: 'R-06', strategy: '완화', action: '테스트 우선순위 조정 · 병행 수행', targetDays: '−4일', actualDays: '−1.5일 (진행)', owner: 'QA', status: '관리 중' },
]

const TOTAL_EMV_SCHEDULE = MOCK_QUANT.reduce((s, r) => s + r.emvSchedule, 0)

export const MOCK_EMV_TREND: RiskEmvTrend = {
  categories: ['Sprint 8', 'Sprint 9', 'Sprint 10', 'Sprint 11 (현재)'],
  total: [42.5, 39.2, 37.1, TOTAL_EMV_SCHEDULE],
  mitigated: [2.1, 4.8, SP10_MITIGATED, SP10_MITIGATED + R02_SP11_MITIGATED],
}

const MOCK_ISSUES: RiskDashboard['issues'] = [
  {
    issueKey: 'MLCSIXZERO-401',
    issueUrl: `${BROWSE}/MLCSIXZERO-401`,
    summary: '[리스크] 신규 요구사항 인입 - 마이버튼 기능 추가',
    status: 'Resolved',
    priority: 'P0',
    category: '요구사항',
    components: ['요구사항'],
    assignee: 'PM',
    ageDays: 12,
    isDone: true,
    responsePlan:
      '대응 전략 : 요구사항 관리 계획 수립 및 정기적인 리뷰를 통해 신규 요구사항 신속 파악\n현재 대응 조치: 요구사항 관리 계획 수립 및 정기적인 리뷰를 통해 변경사항을 신속히 반영.\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    responseStrategy: '요구사항 관리 계획 수립 및 정기적인 리뷰를 통해 신규 요구사항 신속 파악',
    currentAction: '요구사항 관리 계획 수립 및 정기적인 리뷰를 통해 변경사항을 신속히 반영.',
    futurePlan: '정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    missingPlan: false,
  },
  {
    issueKey: 'MLCSIXZERO-402',
    issueUrl: `${BROWSE}/MLCSIXZERO-402`,
    summary: '[리스크] 오디오 freamwork 포팅 지연',
    status: 'Resolved',
    priority: 'P0',
    category: '일정',
    components: ['일정'],
    assignee: 'PL',
    ageDays: 8,
    isDone: true,
    responsePlan:
      '대응 전략 : 개발팀과 긴밀한 소통을 통해 일정 Check, Daily scrum 활동 진행\n현재 대응 조치: 개발 진척도 Daily 확인 진행\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    missingPlan: false,
  },
  {
    issueKey: 'MLCSIXZERO-403',
    issueUrl: `${BROWSE}/MLCSIXZERO-403`,
    summary: '[리스크] System 기능 성능 최적화 및 안정화',
    status: 'Resolved',
    priority: 'P0',
    category: '자원',
    components: ['자원'],
    assignee: 'PM',
    ageDays: 15,
    isDone: true,
    responsePlan:
      '대응 전략 : 시스템 개발 인원 재 분배 및 가용 리소스 늘려 대응 할 것\n현재 대응 조치: Performace, Booting , emergency 등 핵심 기능 세분화 확인\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    missingPlan: false,
  },
  {
    issueKey: 'MLCSIXZERO-404',
    issueUrl: `${BROWSE}/MLCSIXZERO-404`,
    summary: '[리스크] HDMI Multi connect box 및 TV webOS 제어앱 연동 개발 일정 등 외부 의존성 일정 영향',
    status: 'Resolved',
    priority: 'P0',
    category: '외부의존',
    components: ['외부의존'],
    assignee: 'PM',
    ageDays: 6,
    isDone: true,
    responsePlan:
      '대응 전략 : 회피 방안 및 의사 결정 보고 필요\n현재 대응 조치: 일정 영향도 파악 중\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    missingPlan: false,
  },
  {
    issueKey: 'MLCSIXZERO-405',
    issueUrl: `${BROWSE}/MLCSIXZERO-405`,
    summary: '[리스크] 신규 칩셋에 따른 검증 범위가 큼에 따라 품질 확보 일정이 필요',
    status: 'Resolved',
    priority: 'P0',
    category: '품질',
    components: ['품질'],
    assignee: 'QA',
    ageDays: 10,
    isDone: true,
    responsePlan:
      '대응 전략 : funciton별로 조기 안정화 계획 수립 및 테스트 진행\n현재 대응 조치: 자동화 우선 순위 진행하고, Sprint 기준 안정화된 기능 중심으로 단계별 품질 TC 조기 수행 진행\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    missingPlan: false,
  },
  {
    issueKey: 'MLCSIXZERO-406',
    issueUrl: `${BROWSE}/MLCSIXZERO-406`,
    summary: '[리스크] Private rear sound, surround sound, night mode 음장 효과 조합에 따른 변별력 범위 영향성',
    status: 'Resolved',
    priority: 'P1',
    category: '범위',
    components: ['범위'],
    assignee: 'PM',
    ageDays: 20,
    isDone: true,
    responsePlan:
      '대응 전략 : 조합 별 음향 효과 선별 확인/ 유저 가치 제공 가치인지 확인\n현재 대응 조치: 기능 구현 우선 후 조합 확인 할 것\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
    missingPlan: false,
  },
]

function filterIssues(category: RiskCategory) {
  if (category === 'all') return MOCK_ISSUES
  return MOCK_ISSUES.filter((i) => i.category === category)
}

function filterQuant(category: RiskCategory): RiskQuantRow[] {
  if (category === 'all') return MOCK_QUANT
  return MOCK_QUANT.filter((q) => q.category === category)
}

function filterStatusChanges(category: RiskCategory): RiskStatusChangeRow[] {
  if (category === 'all') return MOCK_STATUS_CHANGES
  return MOCK_STATUS_CHANGES.filter((s) => s.category === category)
}

function filterMitigations(category: RiskCategory): RiskMitigationRow[] {
  if (category === 'all') return MOCK_MITIGATIONS
  const ids = new Set(filterQuant(category).map((q) => q.riskId))
  return MOCK_MITIGATIONS.filter((m) => ids.has(m.riskId))
}

function buildEmvKpi(quant: RiskQuantRow[]) {
  const totalEmvSchedule = quant.reduce((s, r) => s + r.emvSchedule, 0)
  const totalEmvEffort = quant.reduce((s, r) => s + r.emvEffort, 0)
  return {
    totalEmvSchedule,
    totalEmvEffort,
    reservePct: Math.round((totalEmvSchedule / RESERVE_DAYS) * 100),
    highExposure: quant.filter((q) => q.emvSchedule >= 5).length,
    mitigationDone: quant.filter((q) => q.status === '완화됨' || q.status === '종료').length,
  }
}

export function getMockRiskDashboard(category: RiskCategory = 'all'): RiskDashboard {
  const issues = filterIssues(category)
  const openIssues = issues.filter((i) => !i.isDone)
  const withPlan = issues.filter((i) => i.responsePlan)
  const quant = filterQuant(category)
  const emvKpi = buildEmvKpi(quant)

  const byCategoryMap = new Map<string, { count: number; open: number }>()
  for (const issue of MOCK_ISSUES) {
    const slot = byCategoryMap.get(issue.category) ?? { count: 0, open: 0 }
    slot.count += 1
    if (!issue.isDone) slot.open += 1
    byCategoryMap.set(issue.category, slot)
  }

  return {
    meta: {
      jql: `(project = MLCSIXZERO) AND labels = "risk"${category !== 'all' ? ` AND component = "${category}"` : ''}`,
      boardId: 12641,
      boardScope: 'project = MLCSIXZERO',
      categoryFilter: category,
      riskLabel: 'risk',
      categoryField: 'components',
      responsePlanField: 'description',
      emvField: 'environment',
      scheduleReserveDays: RESERVE_DAYS,
    },
    kpi: {
      total: issues.length,
      open: openIssues.length,
      closed: issues.length - openIssues.length,
      planFilledPct: issues.length ? Math.round((withPlan.length / issues.length) * 100) : 100,
      missingPlan: issues.length - withPlan.length,
      ...emvKpi,
    },
    byCategory: [...byCategoryMap.entries()].map(([cat, v]) => ({
      category: cat,
      count: v.count,
      open: v.open,
    })),
    quantAnalysis: quant,
    statusChanges: filterStatusChanges(category),
    emvTrend: MOCK_EMV_TREND,
    mitigations: filterMitigations(category),
    issues,
    openIssues,
  }
}
