export type ProcurementVendorId = 'all' | 'mcs' | 'tonly' | 'ite' | 'actions'

export type ProcurementPhaseId =
  | 'all'
  | 'plan'
  | 'contract'
  | 'signed'
  | 'execute'
  | 'verified'
  | 'close'

export interface ProcurementFilterOption {
  id: string
  label: string
  jiraLabel: string
}

export interface ProcurementFilterOptions {
  vendors: ProcurementFilterOption[]
  phases: ProcurementFilterOption[]
}

export interface ProcurementKpi {
  id: string
  label: string
  target: string
  targetNum: number
  actualPct: number
  numerator: number
  denominator: number
  formula: string
  met: boolean
}

export interface ProcurementSummary {
  total: number
  signed: number
  verified: number
  overdue: number
}

export interface ProcurementStatusRow {
  item: string
  vendor: string
  vendorLabel: string
  contractLabel: string
  progress: string
  deliverable: string
  risk: string
}

export interface ProcurementPipelineRow {
  phase: string
  label: string
  count: number
}

export interface ProcurementScheduleRow {
  item: string
  start: string
  end: string
  milestone: string
  current: string
  status: string
}

export interface ProcurementAcceptanceRow {
  item: string
  criteria: string
  method: string
  targetDate: string
  verifiedCount: number
  totalCount: number
  status: string
}

export interface ProcurementMonitoringRow {
  date: string
  category: string
  verdict: string
  note: string
  vendor: string
}

export interface ProcurementRequestRow {
  issueKey: string
  issueUrl?: string
  vendor: string
  vendorLabel: string
  summary: string
  phaseLabel: string
  dueDate: string | null
  status: string
  health: string
}

export interface ProcurementDashboardMeta {
  vendor: string
  phase: string
  jql: string
  boardId: number
  asOf: string
}

export interface ProcurementDashboard {
  meta: ProcurementDashboardMeta
  summary: ProcurementSummary
  kpis: ProcurementKpi[]
  statusItems: ProcurementStatusRow[]
  pipeline: ProcurementPipelineRow[]
  schedule: ProcurementScheduleRow[]
  acceptance: ProcurementAcceptanceRow[]
  monitoring: ProcurementMonitoringRow[]
  requests: ProcurementRequestRow[]
}

export interface ProcurementQueryParams {
  vendor?: ProcurementVendorId
  phase?: ProcurementPhaseId
}
