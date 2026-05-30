// ── 공통 ────────────────────────────────────────────────────────────────────

export type IssueType = 'Story' | 'Epic' | 'Sub-task' | 'Bug' | 'Task';
/** Jira 상태 이름 — 프로젝트별 커스텀 (Open / develop / SoC Closed / Closed / Reopen 등) */
export type IssueStatus = string;
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
  issueUrl?: string;
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
  issueUrl?: string;
  issueType: IssueType;
  summary: string;
  assignee: string;
  status: IssueStatus;
  storyPoints: number;
  priority: Priority;
}

// ── 주간 스프린트 요약 보고 (LLM) ───────────────────────────────────────────

export interface SprintReportMetrics {
  completionRate: number;
  remainingPoints: number;
  daysLeft: number;
  totalPoints: number;
  burndownGap: number;        // 실제-이상 잔여 SP (양수=지연)
  blockerCount: number;
  velocityTrend: string;      // 상승 / 하락 / 유지
}

export interface SprintReport {
  sprintName: string;
  generatedAt: string;        // ISO
  source: 'llm' | 'rule';
  summary: string;
  risks: string[];
  recommendations: string[];
  metrics: SprintReportMetrics;
  /** source=rule 일 때 LLM 미연결/실패 원인 */
  llmDebug?: {
    phase: 'not_enabled' | 'call_failed' | 'parse_failed';
    reason: string;
    rawPreview?: string;
    trace?: string;
    checks?: Array<{ id: string; ok: boolean; detail: string }>;
  };
}

// ── API 응답 래퍼 ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
