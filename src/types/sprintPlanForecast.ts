export type ForecastStatus = 'ok' | 'warning' | 'critical'

export interface SprintBurndownForecast {
  sprintName: string
  remainingSp: number
  daysLeft: number
  requiredDailyBurn: number
  actualDailyBurn: number
  predictedCompletionDate: string | null
  plannedEndDate: string
  delayDays: number
  status: ForecastStatus
  summary: string
}

export interface VelocityForecast {
  avgCompletedSp: number
  avgPlannedSp: number
  currentSprintPlanned: number
  currentSprintCompleted: number
  velocityGap: number
  commitAchievementPct: number
  status: ForecastStatus
  summary: string
}

export interface EmvForecast {
  totalEmvSchedule: number
  totalEmvEffort: number
  scheduleReserveDays: number
  reserveUsedPct: number
  openRisks: number
  highExposure: number
  status: ForecastStatus
  summary: string
}

export interface ResourceForecast {
  teamSize: number
  avgSpPerMember: number
  maxSpPerMember: number
  overloadedCount: number
  status: ForecastStatus
  summary: string
}

export interface SprintPlanForecast {
  asOf: string
  sprintBurndown: SprintBurndownForecast
  velocity: VelocityForecast
  emv: EmvForecast
  resource: ResourceForecast
  alerts: string[]
  meta: {
    dataSource?: 'mock' | 'jira'
    boardId?: number
    methods?: string
  }
}
