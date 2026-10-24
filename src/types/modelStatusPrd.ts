export interface ModelStatusPrdItem {
  id: string
  title: string
  status: string
  type: string
  applyModel: string
  assignee: string
  created: string
  updated: string
  almLabels?: string[]
  reviewLabel?: string
  reviewLabelUpdatedAt?: string
  workflowStageId?: string
  workflowStageLabel?: string
  workflowOrder?: number
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

export interface ModelStatusPrdWorkflowColumn {
  id: string
  label: string
  order: number
}

export interface ModelStatusPrdResponse {
  meta: {
    model?: string | null
    projectKey: string
    almType?: string
    source: string
    terms: string[]
    winningQuery?: string | null
    discoveryHits?: number | null
    listLimit?: number
    filterMode?: string
    total?: number
    polarionConfigured: boolean
    davisConfigured?: boolean
    error?: string
    labelStore?: {
      collection: string
      storedCount: number
      milvusOk: boolean
      error?: string
    }
  }
  workflowColumns?: ModelStatusPrdWorkflowColumn[]
  probe: ModelStatusPrdProbeRow[]
  discovery?: ModelStatusPrdDiscovery | null
  items: ModelStatusPrdItem[]
  discoveredFields?: string[]
}

export interface ModelStatusPrdLabelSaveBody {
  model: string
  prdId: string
  reviewLabel: string
  almLabels?: string[]
}
