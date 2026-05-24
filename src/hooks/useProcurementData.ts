import { useQuery } from '@tanstack/react-query'
import { procurementApi, type ProcurementQueryParams } from '../api/procurementApi'
import type { ProcurementDashboard, ProcurementFilterOptions } from '../types/procurement'
import { USE_MOCK } from '../config/dataSource'
import { getMockProcurementDashboard, MOCK_PROCUREMENT_FILTERS } from '../mocks/mockProcurementData'

export function useProcurementFilters() {
  return useQuery<ProcurementFilterOptions>({
    queryKey: ['procurementFilters'],
    queryFn: USE_MOCK ? () => Promise.resolve(MOCK_PROCUREMENT_FILTERS) : procurementApi.getFilters,
    staleTime: 10 * 60 * 1000,
  })
}

export function useProcurementDashboard(params: ProcurementQueryParams) {
  return useQuery<ProcurementDashboard>({
    queryKey: ['procurementDashboard', params.vendor, params.phase],
    queryFn: USE_MOCK
      ? () =>
          Promise.resolve(
            getMockProcurementDashboard(params.vendor ?? 'all', params.phase ?? 'all')
          )
      : () => procurementApi.getDashboard(params),
    staleTime: 5 * 60 * 1000,
  })
}

export { USE_MOCK as USE_PROCUREMENT_MOCK } from '../config/dataSource'
