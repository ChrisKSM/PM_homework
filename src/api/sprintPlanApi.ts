import client from './client'
import type { SprintPlanTimeline } from '../types/sprintPlan'
import type { SprintPlanForecast } from '../types/sprintPlanForecast'

export const sprintPlanApi = {
  getTimeline: () =>
    client
      .get<SprintPlanTimeline>('/sprint-plan/timeline', { timeout: 120000 })
      .then((r) => r.data),

  getForecast: () =>
    client.get<SprintPlanForecast>('/sprint-plan/forecast', { timeout: 120000 }).then((r) => r.data),
}
