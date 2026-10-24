export interface ModelStatusPrdItem {
  id: string
  title: string
  status: string
  type: string
  applyModel: string
  assignee: string
  created: string
  updated: string
  polarionUrl: string
}

export interface ModelStatusPrdProbeRow {
  query: string
  count: number
  error: string | null
}

export interface ModelStatusPrdResponse {
  meta: {
    model?: string | null
    projectKey: string
    almType?: string
    source: string
    terms: string[]
    winningQuery?: string | null
    total?: number
    polarionConfigured: boolean
    davisConfigured?: boolean
    error?: string
  }
  probe: ModelStatusPrdProbeRow[]
  items: ModelStatusPrdItem[]
  discoveredFields?: string[]
}
