import client from './client'
import type {
  PlanningCompliance,
  PlanningFilterOptions,
  PlanningHierarchyNode,
  PlanningTraceabilityResponse,
  StoryDetail,
} from '../types/planning'

export interface PlanningQueryParams {
  gate?: string
  sprint?: string
  status?: string
}

function buildParams(params?: PlanningQueryParams) {
  if (!params) return undefined
  const q: Record<string, string> = {}
  if (params.gate && params.gate !== 'all') q.gate = params.gate
  if (params.sprint && params.sprint !== 'all') q.sprint = params.sprint
  if (params.status && params.status !== 'all') q.status = params.status
  return Object.keys(q).length ? q : undefined
}

export const planningApi = {
  getFilters: () =>
    client.get<PlanningFilterOptions>('/planning/filters').then((r) => r.data),

  getCompliance: () =>
    client.get<PlanningCompliance>('/planning/compliance').then((r) => r.data),

  getHierarchy: (params?: PlanningQueryParams) =>
    client
      .get<PlanningHierarchyNode[]>('/planning/hierarchy', { params: buildParams(params) })
      .then((r) => r.data),

  getTraceability: (params?: PlanningQueryParams) =>
    client
      .get<PlanningTraceabilityResponse>('/planning/traceability', { params: buildParams(params) })
      .then((r) => r.data),

  getStoryDetail: (issueKey: string) =>
    client.get<StoryDetail>(`/planning/stories/${issueKey}`).then((r) => r.data),
}
