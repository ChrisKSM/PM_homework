// ── 공통 ────────────────────────────────────────────────────────────────────

export type IssueType = 'Story' | 'Epic' | 'Sub-task' | 'Bug' | 'Task';
export type IssueStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Blocked';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

// ── KPI 요약 (책임자용) ──────────────────────────────────────────────────────

export interface ProjectSummary {
  totalProgress: number;       // 전체 진행률 (%)
  completedEpics: number;
  totalEpics: number;
  completedStories: number;
  totalStories: number;
  blockerCount: number;
  lastUpdated: string;         // ISO date string
}

// ── Epic 진행률 ──────────────────────────────────────────────────────────────

export interface EpicProgress {
  epicKey: string;
  epicName: string;
  done: number;
  inProgress: number;
  todo: number;
  total: number;
}

// ── 이슈 상태 분포 ───────────────────────────────────────────────────────────

export interface IssueDistribution {
  status: IssueStatus;
  count: number;
}

// ── Velocity ─────────────────────────────────────────────────────────────────

export interface SprintVelocity {
  sprintName: string;
  planned: number;
  completed: number;
}

// ── 리스크 이슈 ──────────────────────────────────────────────────────────────

export interface RiskIssue {
  issueKey: string;
  summary: string;
  assignee: string;
  status: IssueStatus;
  priority: Priority;
}

// ── Burndown ─────────────────────────────────────────────────────────────────

export interface BurndownPoint {
  day: string;
  ideal: number;
  actual: number;
}

export interface BurndownData {
  sprintName: string;
  totalPoints: number;
  points: BurndownPoint[];
}

// ── 스프린트 KPI ─────────────────────────────────────────────────────────────

export interface SprintSummary {
  sprintName: string;
  remainingPoints: number;
  completionRate: number;      // %
  blockerCount: number;
  endDate: string;
  daysLeft: number;
}

// ── 팀원 워크로드 ────────────────────────────────────────────────────────────

export interface MemberWorkload {
  name: string;
  storyPoints: number;
  issueCount: number;
}

// ── 스프린트 이슈 ────────────────────────────────────────────────────────────

export interface SprintIssue {
  issueKey: string;
  issueType: IssueType;
  summary: string;
  assignee: string;
  status: IssueStatus;
  storyPoints: number;
  priority: Priority;
}

// ── API 응답 래퍼 ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
