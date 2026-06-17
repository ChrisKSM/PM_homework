import client from './client'
import type { SprintPlanTimeline } from '../types/sprintPlan'

export const sprintPlanApi = {
  getTimeline: () =>
    client
      .get<SprintPlanTimeline>('/sprint-plan/timeline', { timeout: 120000 })
      .then((r) => r.data),
}
