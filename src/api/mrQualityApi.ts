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

export const mrQualityApi = {
  getDashboard: (model?: string) =>
    client
      .get<MrQualityDashboard>('/mr/quality/dashboard', { params: model ? { model } : {} })
      .then((r) => r.data),
}
