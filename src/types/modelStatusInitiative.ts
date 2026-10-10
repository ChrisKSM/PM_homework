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
  /** fixVersions (Jira) */
  fixedIn?: string
  /** Estimated Effort — customfield_35454 */
  score?: string
  grouping?: string
  startDate?: string
  issueUrl?: string
  model?: string
}
