import type {
  ProjectSummary,
  EpicProgress,
  IssueDistribution,
  SprintVelocity,
  RiskIssue,
  BurndownData,
  SprintSummary,
  MemberWorkload,
  SprintIssue,
  SprintReport,
} from '../types/jira'

// ── 책임자 대시보드 ──────────────────────────────────────────────────────────

export const mockProjectSummary: ProjectSummary = {
  totalProgress: 73,
  completedEpics: 12,
  totalEpics: 17,
  completedStories: 148,
  totalStories: 203,
  blockerCount: 5,
  lastUpdated: new Date().toISOString(),
}

export const mockEpicProgress: EpicProgress[] = [
  { epicKey: 'PROJ-001', epicName: '사용자 관리', done: 18, inProgress: 8, todo: 4, total: 30 },
  { epicKey: 'PROJ-002', epicName: '결제 시스템', done: 25, inProgress: 5, todo: 0, total: 30 },
  { epicKey: 'PROJ-003', epicName: '알림', done: 10, inProgress: 12, todo: 8, total: 30 },
  { epicKey: 'PROJ-004', epicName: '대시보드', done: 30, inProgress: 6, todo: 4, total: 40 },
  { epicKey: 'PROJ-005', epicName: 'API 연동', done: 8, inProgress: 15, todo: 7, total: 30 },
]

export const mockIssueDistribution: IssueDistribution[] = [
  { status: 'Open', count: 28 },
  { status: 'SOC DEVELOP', count: 32 },
  { status: 'SoC Review', count: 14 },
  { status: 'SOC DELIVERED', count: 96 },
  { status: 'Closed', count: 20 },
  { status: 'Reopened', count: 5 },
  { status: 'Developer Draft', count: 8 },
]

export const mockVelocity: SprintVelocity[] = [
  { sprintName: 'Sprint 1', planned: 40, completed: 34 },
  { sprintName: 'Sprint 2', planned: 40, completed: 42 },
  { sprintName: 'Sprint 3', planned: 45, completed: 38 },
  { sprintName: 'Sprint 4', planned: 50, completed: 51 },
  { sprintName: 'Sprint 5', planned: 50, completed: 45 },
  { sprintName: 'Sprint 6', planned: 60, completed: 58 },
  { sprintName: 'Sprint 7', planned: 65, completed: 40 },
]

const BROWSE = 'https://harmony.lge.com:8443/issue/browse'

export const mockRiskIssues: RiskIssue[] = [
  { issueKey: 'MLCSIXZERO-148', issueUrl: `${BROWSE}/MLCSIXZERO-148`, summary: '로그인 세션 만료 오류', assignee: '최지아', status: 'Open', priority: 'Critical' },
  { issueKey: 'MLCSIXZERO-163', issueUrl: `${BROWSE}/MLCSIXZERO-163`, summary: '결제 실패 시 롤백 미구현', assignee: '김민준', status: 'develop', priority: 'Critical' },
  { issueKey: 'MLCSIXZERO-171', issueUrl: `${BROWSE}/MLCSIXZERO-171`, summary: 'API Rate Limit 초과 처리', assignee: '박도현', status: 'Reopen', priority: 'Critical' },
  { issueKey: 'MLCSIXZERO-182', issueUrl: `${BROWSE}/MLCSIXZERO-182`, summary: '알림 푸시 지연 이슈', assignee: '이서연', status: 'Open', priority: 'Critical' },
]

// ── 개발팀 대시보드 ──────────────────────────────────────────────────────────

export const mockSprintSummary: SprintSummary = {
  sprintName: 'Sprint 7',
  remainingPoints: 25,
  completionRate: 62,
  blockerCount: 3,
  endDate: '2026-05-16',
  daysLeft: 6,
}

export const mockBurndown: BurndownData = {
  sprintName: 'Sprint 7',
  totalPoints: 65,
  points: [
    { day: 'Day 1', ideal: 65, actual: 65 },
    { day: 'Day 2', ideal: 58, actual: 60 },
    { day: 'Day 3', ideal: 52, actual: 57 },
    { day: 'Day 4', ideal: 45, actual: 51 },
    { day: 'Day 5', ideal: 39, actual: 46 },
    { day: 'Day 6', ideal: 32, actual: 40 },
    { day: 'Day 7', ideal: 26, actual: 36 },
    { day: 'Day 8', ideal: 19, actual: 28 },
    { day: 'Day 9', ideal: 13, actual: 25 },
    { day: 'Day 10', ideal: 6, actual: 25 },
  ],
}

export const mockTeamWorkload: MemberWorkload[] = [
  { name: '김민준', storyPoints: 21, issueCount: 6 },
  { name: '이서연', storyPoints: 18, issueCount: 5 },
  { name: '박도현', storyPoints: 25, issueCount: 7 },
  { name: '최지아', storyPoints: 15, issueCount: 4 },
  { name: '정우진', storyPoints: 20, issueCount: 5 },
  { name: '임하은', storyPoints: 11, issueCount: 3 },
]

export const mockSprintIssues: SprintIssue[] = [
  { issueKey: 'MLCSIXZERO-142', issueUrl: `${BROWSE}/MLCSIXZERO-142`, issueType: 'Story', summary: '결제 API 통합 구현', assignee: '김민준', status: 'develop', storyPoints: 5, priority: 'High' },
  { issueKey: 'MLCSIXZERO-143', issueUrl: `${BROWSE}/MLCSIXZERO-143`, issueType: 'Sub-task', summary: '결제 위젯 UI 개발', assignee: '이서연', status: 'develop', storyPoints: 3, priority: 'High' },
  { issueKey: 'MLCSIXZERO-145', issueUrl: `${BROWSE}/MLCSIXZERO-145`, issueType: 'Story', summary: '알림 서비스 백엔드 구현', assignee: '박도현', status: 'Open', storyPoints: 8, priority: 'Medium' },
  { issueKey: 'MLCSIXZERO-148', issueUrl: `${BROWSE}/MLCSIXZERO-148`, issueType: 'Bug', summary: '로그인 세션 만료 오류 수정', assignee: '최지아', status: 'Reopen', storyPoints: 2, priority: 'Critical' },
  { issueKey: 'MLCSIXZERO-151', issueUrl: `${BROWSE}/MLCSIXZERO-151`, issueType: 'Epic', summary: '사용자 프로필 관리 기능', assignee: '정우진', status: 'develop', storyPoints: 13, priority: 'Medium' },
  { issueKey: 'MLCSIXZERO-155', issueUrl: `${BROWSE}/MLCSIXZERO-155`, issueType: 'Story', summary: '대시보드 필터 기능 추가', assignee: '임하은', status: 'Open', storyPoints: 5, priority: 'Low' },
  { issueKey: 'MLCSIXZERO-158', issueUrl: `${BROWSE}/MLCSIXZERO-158`, issueType: 'Task', summary: 'API 문서 작성 (Swagger)', assignee: '박도현', status: 'SoC Closed', storyPoints: 2, priority: 'Low' },
  { issueKey: 'MLCSIXZERO-161', issueUrl: `${BROWSE}/MLCSIXZERO-161`, issueType: 'Story', summary: 'OAuth2.0 소셜 로그인', assignee: '김민준', status: 'Closed', storyPoints: 8, priority: 'High' },
]

export const mockSprintReport: SprintReport = {
  sprintName: 'Sprint 7',
  generatedAt: new Date().toISOString(),
  source: 'rule',
  summary:
    'Sprint 7 완료율 62%, 잔여 25 SP (D-6). 번다운은 이상선보다 6 SP 뒤처져 있어요. ' +
    'Velocity는 직전 평균 44.7 SP 대비 이번 40 SP로 하락 추세예요.',
  risks: [
    '미해결 P0 Story 2건 — 스프린트 목표 달성을 직접 위협',
    '번다운 6 SP 지연 — 현재 페이스 유지 시 미완료 가능',
    'Velocity 하락 추세 — 팀 처리량 저하 또는 과다 계획 가능',
    '워크로드 집중: 박도현 (25 SP)',
  ],
  recommendations: [
    '데일리에서 블로커 P0 Story 우선 처리 담당자/기한 확정',
    '스코프 재조정 또는 잔여 작업 분할로 소진 속도 확보',
    '박도현 작업 일부 재분배 검토',
  ],
  metrics: {
    completionRate: 62,
    remainingPoints: 25,
    daysLeft: 6,
    totalPoints: 65,
    burndownGap: 6,
    blockerCount: 2,
    velocityTrend: '하락',
  },
}
