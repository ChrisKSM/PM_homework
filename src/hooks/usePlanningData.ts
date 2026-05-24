import { useQuery } from '@tanstack/react-query'
import { planningApi, type PlanningQueryParams } from '../api/planningApi'
import type {
  PlanningCompliance,
  PlanningFilterOptions,
  PlanningHierarchyNode,
  StoryDetail,
  TraceabilityRow,
} from '../types/planning'
import { USE_MOCK } from '../config/dataSource'
import {
  mockHierarchy,
  mockPlanningCompliance,
  mockStoryDetails,
  mockTraceabilityRows,
} from '../mocks/mockPlanningData'

const MOCK_FILTERS: PlanningFilterOptions = {
  gates: [
    { value: 'Gate 1', label: 'Gate 1' },
    { value: 'Gate 2', label: 'Gate 2' },
  ],
  sprints: [
    { value: 'Sprint 1', label: 'Sprint 1' },
    { value: 'Sprint 2', label: 'Sprint 2' },
    { value: 'Sprint 3', label: 'Sprint 3' },
  ],
}

function filterMockRows(params?: PlanningQueryParams): TraceabilityRow[] {
  return mockTraceabilityRows.filter((row) => {
    if (params?.gate && params.gate !== 'all') {
      if (params.gate === 'Gate 1' && !row.gate.includes('Gate 1')) return false
      if (params.gate === 'Gate 2' && !row.gate.includes('Gate 2')) return false
      if (params.gate !== 'Gate 1' && params.gate !== 'Gate 2' && row.gate !== params.gate) return false
    }
    if (params?.sprint && params.sprint !== 'all' && row.sprint !== params.sprint) return false
    if (params?.status && params.status !== 'all' && row.status !== params.status) return false
    return true
  })
}

export function usePlanningFilters() {
  return useQuery<PlanningFilterOptions>({
    queryKey: ['planningFilters'],
    queryFn: USE_MOCK ? () => Promise.resolve(MOCK_FILTERS) : planningApi.getFilters,
    staleTime: 10 * 60 * 1000,
  })
}

export function usePlanningCompliance() {
  return useQuery<PlanningCompliance>({
    queryKey: ['planningCompliance'],
    queryFn: USE_MOCK ? () => Promise.resolve(mockPlanningCompliance) : planningApi.getCompliance,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlanningHierarchy(params?: PlanningQueryParams) {
  return useQuery<PlanningHierarchyNode[]>({
    queryKey: ['planningHierarchy', params?.gate, params?.sprint, params?.status],
    queryFn: USE_MOCK
      ? () => Promise.resolve(mockHierarchy)
      : () => planningApi.getHierarchy(params),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlanningTraceability(params?: PlanningQueryParams) {
  return useQuery<TraceabilityRow[]>({
    queryKey: ['planningTraceability', params?.gate, params?.sprint, params?.status],
    queryFn: USE_MOCK
      ? () => Promise.resolve(filterMockRows(params))
      : () => planningApi.getTraceability(params),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStoryDetail(issueKey: string | null) {
  return useQuery<StoryDetail>({
    queryKey: ['storyDetail', issueKey],
    queryFn: () => {
      if (!issueKey) throw new Error('issueKey required')
      if (USE_MOCK) {
        const detail = mockStoryDetails[issueKey]
        if (!detail) throw new Error('Story not found')
        return Promise.resolve(detail)
      }
      return planningApi.getStoryDetail(issueKey)
    },
    enabled: !!issueKey,
    staleTime: 2 * 60 * 1000,
  })
}

export { USE_MOCK as USE_PLANNING_MOCK } from '../config/dataSource'
