export type InitiativeStatusBucket =
  | 'Delivered'
  | 'Closed'
  | 'In Progress'
  | 'DRAFTING'
  | 'Suspended'
  | 'ELT REVIEW'
  | 'Deferred'

export interface ModelStatusInitiativeIssue {
  key: string
  summary: string
  status: InitiativeStatusBucket | string
  due: string
  assignee: string
  product: string
  event: string
  pm: string
  issueUrl?: string
  model?: string
}
