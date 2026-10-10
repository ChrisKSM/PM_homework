/** 모델현황 — Initiative · Epic · IR/SP 마일스톤 Gantt */

export interface ReleaseIrBand {
  id: string
  title: string
  subtitle: string
  sprintFrom: number
  sprintTo: number
}

export interface ReleaseMilestone {
  id: string
  label: string
  sprint: number
}

export interface ReleaseEpicRow {
  issueKey: string
  summary: string
  color: string
  startSp: number
  endSp: number
  issueUrl?: string
}

export interface ModelReleaseGanttData {
  sprintMin: number
  sprintMax: number
  irBands: ReleaseIrBand[]
  milestones: ReleaseMilestone[]
  epics: ReleaseEpicRow[]
}
