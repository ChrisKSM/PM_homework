import client from './client'

export interface MrQualityKpi {
  total: number
  fixed: number
  open: number
  criticalMajor: number
  inProgress: number
  fixRate: number
}

export interface ChartDataItem {
  name: string
  value: number
}

export interface MrOpenIssue {
  key: string
  title: string
  model: string
  category: string
  source: string
  assignee: string
  status: string
  severity: string
  swVersion: string
}

export interface MrQualityDashboard {
  kpi: MrQualityKpi
  charts: {
    bySource: ChartDataItem[]
    byModel: ChartDataItem[]
    byCategory: ChartDataItem[]
  }
  openIssues: MrOpenIssue[]
  modelFilter: string
}

export interface MrQualityParams {
  project_name?: string
  event_sequence?: string
  model?: string
}

export const mrQualityApi = {
  getDashboard: (params?: MrQualityParams) => {
    const q: Record<string, string> = {}
    if (params?.project_name) q.project_name = params.project_name
    if (params?.event_sequence) q.event_sequence = params.event_sequence
    if (params?.model) q.model = params.model
    return client
      .get<MrQualityDashboard>('/mr/quality/dashboard', { params: Object.keys(q).length ? q : undefined })
      .then((r) => r.data)
  },
}
