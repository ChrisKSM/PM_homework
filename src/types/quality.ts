export type QualityEventGroup = 'DEV' | 'FC' | 'PV' | 'AUTO'

export type QualityCategory = 'all' | string

export interface QualityPhaseOption {
  phase: string
  label: string
  jiraLabel: string
}

export interface QualityFilterOptions {
  eventGroups: { value: QualityEventGroup; label: string }[]
  phases: Record<QualityEventGroup, QualityPhaseOption[]>
  featureCategories?: { value: string; label: string }[]
}

export interface QualityKpi {
  discovered: number
  resolved: number
  open: number
  p0p1p2Open?: number
  p1p2Open: number
  resolveRatePct: number
}

export interface QualityAgingKpi {
  avgResolveDays: number
  medianResolveDays: number
  avgOpenAgeDays: number
  p0p1p2AvgResolveDays?: number
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
  issueUrl?: string
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
  boardId?: number
  categoryFilter: string
  responsePlanField?: string | null
  responseActionField?: string | null
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
  p0p1p2OpenIssues?: QualityIssueRow[]
  p1p2OpenIssues: QualityIssueRow[]
  openIssues: QualityIssueRow[]
}

export interface QualityQueryParams {
  event?: QualityEventGroup
  phase?: string
  category?: QualityCategory
}

// LLM 품질 분석
export interface QualityAiRiskPattern {
  pattern: string
  detail: string
  severity: 'High' | 'Medium' | 'Low'
}

export interface QualityAiImprovement {
  action: string
  expected_impact: string
  priority: number
}

export interface QualityAiAnalysis {
  source: 'llm' | 'rule'
  generated_at: string
  event: string
  phaseLabel: string
  executive_summary: string
  concentration_analysis: string
  risk_patterns: QualityAiRiskPattern[]
  improvements: QualityAiImprovement[]
  prediction: string
  kpi_snapshot: QualityKpi
  llmDebug?: {
    phase: string
    reason: string
  }
}
