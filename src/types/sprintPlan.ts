export type SprintPlanStatus = 'completed' | 'active' | 'future'
export type SprintPlanIssueType = 'Epic' | 'Story' | 'Risk'

export interface SprintPlanRisk {
  id: string
  issueKey: string
  issueUrl: string
  summary: string
  /** Jira Description field — 대응 계획 */
  description: string
  /** Jira Environment field — EMV / R-ID */
  environment: string
  /** 리스크 발생/갱신 시점 (Gantt 막대 위 마커 위치) */
  markerDate: string
  category: string
}

export interface SprintDefinition {
  key: string
  label: string
  startDate: string
  endDate: string
  ir: number
  gate: string
}

export interface SprintPlanRow {
  id: string
  issueType: SprintPlanIssueType
  issueKey: string
  issueUrl: string
  summary: string
  /** Jira fixVersions (원본) */
  fixVersion: string
  /** fixVersions → Gate 0/1/2 표시 */
  gate: string
  labels: string[]
  isMvp: boolean
  sprintKey: string
  sprintLabel: string
  startDate: string
  endDate: string
  status: SprintPlanStatus
  epicKey?: string
  risks: SprintPlanRisk[]
}

export interface SprintPlanTimeline {
  /** Gantt 축 — 2월~8월 */
  ganttStart: string
  ganttEnd: string
  sprintRangeStart: string
  sprintRangeEnd: string
  sprints: SprintDefinition[]
  rows: SprintPlanRow[]
  meta: {
    fixVersionField: string
    riskLabel: string
    totalSprints: number
    activeSprint: string
    jiraBrowseBase: string
    dataSource?: 'mock' | 'jira'
    boardId?: number
    message?: string
    riskMatch?: string
    mvpMatch?: string
    riskRows?: number
    riskJqlMatched?: number
    riskJqlUnmapped?: number
  }
}
