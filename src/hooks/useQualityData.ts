import { useQuery } from '@tanstack/react-query'
import { qualityApi, type QualityQueryParams } from '../api/qualityApi'
import type { QualityDashboard, QualityFilterOptions } from '../types/quality'
import { USE_MOCK } from '../config/dataSource'
import { getMockQualityDashboard, MOCK_QUALITY_FILTERS } from '../mocks/mockQualityData'

export function useQualityFilters() {
  return useQuery<QualityFilterOptions>({
    queryKey: ['qualityFilters'],
    queryFn: USE_MOCK ? () => Promise.resolve(MOCK_QUALITY_FILTERS) : qualityApi.getFilters,
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
