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
  { status: 'Done', count: 148 },
  { status: 'In Progress', count: 32 },
  { status: 'In Review', count: 12 },
  { status: 'To Do', count: 28 },
  { status: 'Blocked', count: 5 },
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

export const mockRiskIssues: RiskIssue[] = [
  { issueKey: 'PROJ-148', summary: '로그인 세션 만료 오류', assignee: '최지아', status: 'Blocked', priority: 'Critical' },
  { issueKey: 'PROJ-163', summary: '결제 실패 시 롤백 미구현', assignee: '김민준', status: 'Blocked', priority: 'High' },
  { issueKey: 'PROJ-171', summary: 'API Rate Limit 초과 처리', assignee: '박도현', status: 'In Review', priority: 'High' },
  { issueKey: 'PROJ-182', summary: '알림 푸시 지연 이슈', assignee: '이서연', status: 'Blocked', priority: 'Medium' },
  { issueKey: 'PROJ-194', summary: '모바일 반응형 레이아웃 오류', assignee: '임하은', status: 'In Progress', priority: 'Medium' },
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
  { issueKey: 'PROJ-142', issueType: 'Story', summary: '결제 API 통합 구현', assignee: '김민준', status: 'In Progress', storyPoints: 5, priority: 'High' },
  { issueKey: 'PROJ-143', issueType: 'Sub-task', summary: '결제 위젯 UI 개발', assignee: '이서연', status: 'In Progress', storyPoints: 3, priority: 'High' },
  { issueKey: 'PROJ-145', issueType: 'Story', summary: '알림 서비스 백엔드 구현', assignee: '박도현', status: 'To Do', storyPoints: 8, priority: 'Medium' },
  { issueKey: 'PROJ-148', issueType: 'Bug', summary: '로그인 세션 만료 오류 수정', assignee: '최지아', status: 'Blocked', storyPoints: 2, priority: 'Critical' },
  { issueKey: 'PROJ-151', issueType: 'Epic', summary: '사용자 프로필 관리 기능', assignee: '정우진', status: 'In Progress', storyPoints: 13, priority: 'Medium' },
  { issueKey: 'PROJ-155', issueType: 'Story', summary: '대시보드 필터 기능 추가', assignee: '임하은', status: 'To Do', storyPoints: 5, priority: 'Low' },
  { issueKey: 'PROJ-158', issueType: 'Task', summary: 'API 문서 작성 (Swagger)', assignee: '박도현', status: 'In Review', storyPoints: 2, priority: 'Low' },
  { issueKey: 'PROJ-161', issueType: 'Story', summary: 'OAuth2.0 소셜 로그인', assignee: '김민준', status: 'In Progress', storyPoints: 8, priority: 'High' },
]
