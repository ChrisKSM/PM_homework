import { useQuery } from '@tanstack/react-query'
import { qualityApi, type QualityQueryParams } from '../api/qualityApi'
import type { QualityDashboard, QualityFilterOptions } from '../types/quality'
import { USE_MOCK } from '../config/dataSource'
import { getMockQualityDashboard, MOCK_QUALITY_FILTERS } from '../mocks/mockQualityData'

function normalizeQualityFilters(raw: QualityFilterOptions | undefined): QualityFilterOptions {
  return {
    eventGroups: raw?.eventGroups?.length ? raw.eventGroups : MOCK_QUALITY_FILTERS.eventGroups,
    phases: raw?.phases ?? MOCK_QUALITY_FILTERS.phases,
    featureCategories: raw?.featureCategories ?? MOCK_QUALITY_FILTERS.featureCategories,
  }
}

export function useQualityFilters() {
  return useQuery<QualityFilterOptions>({
    queryKey: ['qualityFilters'],
    queryFn: USE_MOCK
      ? () => Promise.resolve(MOCK_QUALITY_FILTERS)
      : () => qualityApi.getFilters().then(normalizeQualityFilters),
    staleTime: 10 * 60 * 1000,
  })
}

export function useQualityDashboard(params: QualityQueryParams) {
  return useQuery<QualityDashboard>({
    queryKey: ['qualityDashboard', params.event, params.phase, params.category],
    queryFn: USE_MOCK
      ? () =>
          Promise.resolve(
            getMockQualityDashboard(params.event, params.phase, params.category ?? 'all')
          )
      : () => qualityApi.getDashboard(params),
    staleTime: 5 * 60 * 1000,
  })
}

export { USE_MOCK as USE_QUALITY_MOCK } from '../config/dataSource'
