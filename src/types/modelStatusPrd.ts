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
  listPath?: string
}

export interface ModelStatusPrdDiscovery {
  hits?: number
  bestProbe?: ModelStatusPrdProbeRow
  sampleAnalysis?: {
    typesSeen?: Record<string, number>
    applyFieldHints?: Array<{ field: string; samples: string[] }>
    interestingKeys?: string[]
  }
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
  discovery?: ModelStatusPrdDiscovery | null
  items: ModelStatusPrdItem[]
  discoveredFields?: string[]
}
