export interface ModelStatusStorySpKpiInitiative {
  initiativeKey: string
  summary: string
  descriptionSource?: string
  descriptionChars?: number
  descriptionPreview?: string
  plannedSpFromDescription: number
  milestones: Array<{
    milestone: string
    summary: string
    targetSprint: string
    dueDate: string
    plannedSp: number
    consumedSpInTable?: number | null
    completionStatus: string
  }>
  storySpConsumed?: number
  storySpTotal: number
  storySpDone: number
  storyCount: number
  consumptionPctInitiative?: number | null
  completionPctInitiative?: number | null
}

export interface ModelStatusStorySpKpiResponse {
  model?: string | null
  label: string
  initiativeCount: number
  plannedSpTotal: number
  storySpConsumed: number
  storySpTotal: number
  storySpDone: number
  consumptionPct: number | null
  burnPctVsPlan?: number | null
  completionPct: number | null
  byInitiative: ModelStatusStorySpKpiInitiative[]
  errors: string[]
  definition?: Record<string, string>
}
