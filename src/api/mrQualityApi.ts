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
  projectName?: string
  projectNames?: string[]
  eventSequence?: string
  createdFrom?: string
  createdTo?: string
  query?: string
}

export interface MrQualityParams {
  project_names?: string[]
  event_sequence?: string
  model?: string
  created_from?: string
  created_to?: string
}

export interface MrSequencesResponse {
  sequences: string[]
  projectNames?: string[]
  projectName?: string
}

function toSearchParams(params?: MrQualityParams): URLSearchParams {
  const search = new URLSearchParams()
  for (const name of params?.project_names ?? []) {
    const trimmed = name.trim()
    if (trimmed) search.append('project_name', trimmed)
  }
  if (params?.event_sequence) search.set('event_sequence', params.event_sequence)
  if (params?.model) search.set('model', params.model)
  if (params?.created_from) search.set('created_from', params.created_from)
  if (params?.created_to) search.set('created_to', params.created_to)
  return search
}

export const mrQualityApi = {
  getSequences: (projectNames: string[]) => {
    const search = new URLSearchParams()
    for (const name of projectNames) {
      if (name.trim()) search.append('project_name', name.trim())
    }
    return client
      .get<MrSequencesResponse>(`/mr/quality/sequences?${search.toString()}`)
      .then((r) => r.data)
  },

  getDashboard: (params?: MrQualityParams) => {
    const search = toSearchParams(params)
    const qs = search.toString()
    return client
      .get<MrQualityDashboard>(`/mr/quality/dashboard${qs ? `?${qs}` : ''}`)
      .then((r) => r.data)
  },
}
