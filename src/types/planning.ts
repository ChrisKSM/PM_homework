export type PlanningLevel = 'release' | 'sprint' | 'epic' | 'story'

export type ComplianceStatus = 'ok' | 'warn' | 'fail' | 'pending'

export interface PlanningChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface PlanningCompliance {
  hierarchyLinkedPct: number
  acCompletePct: number
  sprintGoalPct: number
  checklist: PlanningChecklistItem[]
  meta?: {
    totalStories: number
    linkedStories: number
    sprintCount: number
    dataSource: 'jira'
  }
}

export interface PlanningHierarchyNode {
  id: string
  level: PlanningLevel
  key: string
  label: string
  parentId: string | null
  goal: string
  criteria: string
  status: ComplianceStatus
  children?: PlanningHierarchyNode[]
}

export interface TraceabilityRow {
  issueKey: string
  summary: string
  gate: string
  sprint: string
  epic: string
  acStatus: string
  dodStatus: string
  priorityRationale: string | null
  status: ComplianceStatus
}

export interface StoryDetail {
  issueKey: string
  summary: string
  gate: string
  sprint: string
  epic: string
  sprintGoal: string
  acceptanceCriteria: string[]
  dodItems: { label: string; done: boolean }[]
  priorityRationale: string | null
}

export interface PlanningFilterOption {
  value: string
  label: string
}

export interface PlanningFilterOptions {
  gates: PlanningFilterOption[]
  sprints: PlanningFilterOption[]
}
