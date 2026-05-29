export type RiskCategory =
  | 'all'
  | '요구사항'
  | '일정'
  | '자원'
  | '기술'
  | '외부의존'
  | '품질'
  | '범위'
  | '미지정'

export interface RiskCategoryOption {
  value: string
  label: string
}

export interface RiskFilterOptions {
  categories: RiskCategoryOption[]
  riskLabel: string
  categoryField: string
  responsePlanField: string
  emvField?: string
}

export interface RiskKpi {
  total: number
  open: number
  closed: number
  planFilledPct: number
  missingPlan: number
  totalEmvSchedule?: number
  totalEmvEffort?: number
  reservePct?: number
  highExposure?: number
  mitigationDone?: number
}

export interface RiskCategoryRow {
  category: string
  count: number
  open: number
}

export interface RiskQuantRow {
  riskId: string
  category: string
  issueKey: string
  title?: string
  pPct: number
  iSchedule: number
  iEffort: number
  emvSchedule: number
  emvEffort: number
  qualScore?: number
  level: string
  priority: number
  strategy?: string
  owner?: string
  status: string
}

export interface RiskStatusChangeRow {
  riskId: string
  category: string
  issueKey: string
  beforePI: string
  afterPI: string
  deltaEmvSchedule: string
  note: string
}

export interface RiskEmvTrend {
  categories: string[]
  total: number[]
  mitigated: number[]
}

export interface RiskIssueRow {
  issueKey: string
  issueUrl?: string
  summary: string
  status: string
  priority: string
  category: string
  components: string[]
  assignee: string
  ageDays: number
  isDone?: boolean
  responsePlan: string | null
  responseStrategy?: string | null
  currentAction?: string | null
  futurePlan?: string | null
  missingPlan?: boolean
}

export interface RiskMitigationRow {
  riskId: string
  strategy: string
  action: string
  targetDays: string
  actualDays: string
  owner: string
  status: string
}

export interface RiskDashboardMeta {
  jql: string
  boardId?: number
  boardScope?: string
  categoryFilter: string
  riskLabel: string
  categoryField: string
  responsePlanField: string
  emvField?: string
  scheduleReserveDays?: number
  asOf?: string
}

export interface RiskDashboard {
  meta: RiskDashboardMeta
  kpi: RiskKpi
  byCategory: RiskCategoryRow[]
  quantAnalysis?: RiskQuantRow[]
  statusChanges?: RiskStatusChangeRow[]
  emvTrend?: RiskEmvTrend
  mitigations?: RiskMitigationRow[]
  issues: RiskIssueRow[]
  openIssues: RiskIssueRow[]
}

export interface RiskQueryParams {
  category?: RiskCategory
}
