export type QualityEventGroup = 'DEV' | 'FC' | 'PV' | 'AUTO'

export type QualityCategory = 'all' | 'bug' | 'function' | 'auto'

export interface QualityPhaseOption {
  phase: string
  label: string
  jiraLabel: string
}

export interface QualityFilterOptions {
  eventGroups: { value: QualityEventGroup; label: string }[]
  phases: Record<QualityEventGroup, QualityPhaseOption[]>
}

export interface QualityKpi {
  discovered: number
  resolved: number
  open: number
  p1p2Open: number
  resolveRatePct: number
}

export interface QualityAgingKpi {
  avgResolveDays: number
  medianResolveDays: number
  avgOpenAgeDays: number
  p1p2AvgResolveDays: number
}

export interface QualityPriorityRow {
  priority: string
  discovered: number
  resolved: number
  open: number
}

export interface QualityCategoryRow {
  category: string
  count: number
}

export interface QualityAgingBucket {
  label: string
  count: number
}

export interface QualityAvgResolveRow {
  priority: string
  days: number
}

export interface QualityIssueRow {
  issueKey: string
  priority: string
  category: string
  summary: string
  status: string
  assignee: string
  ageDays: number
  responsePlan: string | null
  responseAction: string | null
  missingPlan?: boolean
}

export interface QualityDashboardMeta {
  event: string
  phase: string
  phaseLabel: string
  jiraLabel: string
  jql: string
  categoryFilter: string
}

export interface QualityDashboard {
  meta: QualityDashboardMeta
  kpi: QualityKpi
  agingKpi: QualityAgingKpi
  byPriority: QualityPriorityRow[]
  byCategory: QualityCategoryRow[]
  resolveAgingBuckets: QualityAgingBucket[]
  openAgingBuckets: QualityAgingBucket[]
  avgResolveByPriority: QualityAvgResolveRow[]
  p1p2OpenIssues: QualityIssueRow[]
  openIssues: QualityIssueRow[]
}

export interface QualityQueryParams {
  event?: QualityEventGroup
  phase?: string
  category?: QualityCategory
}
