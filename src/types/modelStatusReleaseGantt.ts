/** 모델현황 — Initiative · Epic · IR/SP 마일스톤 Gantt */

export interface ReleaseIrBand {
  id: string
  title: string
  subtitle: string
  sprintFrom: number
  sprintTo: number
}

export interface ReleaseSprintDef {
  sp: number
  ir: number
  key: string
  label: string
  startDate: string
  endDate: string
}

export interface ReleaseMilestone {
  issueKey: string
  label: string
  sprint: number
  summary?: string
  epicKey?: string
  issueUrl?: string
}

export interface ReleaseEpicRow {
  issueKey: string
  summary: string
  color: string
  startSp: number
  endSp: number
  startDate?: string
  endDate?: string
  status?: string
  issueUrl?: string
  milestones?: ReleaseMilestone[]
}

export interface ModelReleaseGanttData {
  sprintMin: number
  sprintMax: number
  irBands: ReleaseIrBand[]
  sprints?: ReleaseSprintDef[]
  milestones: ReleaseMilestone[]
  epics: ReleaseEpicRow[]
}

export interface ModelReleaseGanttResponse {
  meta: {
    asOf: string
    epicJqls?: string[]
    initiativeKey?: string | null
    initiativeKeys?: string[]
    initiativeCount?: number
    discoveredEpicKeys?: string[]
    discovery?: {
      fromInitiativeGraph?: string[]
      fromLinkedWorkItems?: string[]
      harmonyEpicKeys?: string[]
    }
    epicCount?: number
    milestoneCount?: number
    model?: string | null
    label?: string | null
    errors?: string[]
  }
  calendar: ModelReleaseGanttData
  initiative: {
    key: string
    summary: string
    issueUrl?: string
  } | null
  epics: ReleaseEpicRow[]
  milestones: ReleaseMilestone[]
}
