import { useQuery } from '@tanstack/react-query'
import { USE_MOCK } from '../config/dataSource'
import { sprintPlanApi } from '../api/sprintPlanApi'
import { mockSprintPlanTimeline } from '../mocks/mockSprintPlanData'
import { mockSprintPlanForecast } from '../mocks/mockSprintPlanForecast'
import type { SprintPlanTimeline } from '../types/sprintPlan'
import type { SprintPlanForecast } from '../types/sprintPlanForecast'

export function useSprintPlanTimeline() {
  return useQuery<SprintPlanTimeline>({
    queryKey: ['sprintPlanTimeline', USE_MOCK ? 'mock' : 'api'],
    queryFn: USE_MOCK
      ? () => Promise.resolve(mockSprintPlanTimeline)
      : () => sprintPlanApi.getTimeline(),
    staleTime: USE_MOCK ? 60_000 : 5 * 60 * 1000,
    retry: USE_MOCK ? 0 : 2,
  })
}

export function useSprintPlanForecast() {
  return useQuery<SprintPlanForecast>({
    queryKey: ['sprintPlanForecast', USE_MOCK ? 'mock' : 'api'],
    queryFn: USE_MOCK
      ? () => Promise.resolve(mockSprintPlanForecast)
      : () => sprintPlanApi.getForecast(),
    staleTime: USE_MOCK ? 60_000 : 2 * 60 * 1000,
    retry: USE_MOCK ? 0 : 2,
  })
}

export { USE_MOCK as USE_SPRINT_PLAN_MOCK } from '../config/dataSource'
