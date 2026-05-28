import { useQuery } from '@tanstack/react-query'
import { riskApi, type RiskQueryParams } from '../api/riskApi'
import type { RiskDashboard, RiskFilterOptions } from '../types/risk'
import { USE_MOCK } from '../config/dataSource'
import { getMockRiskDashboard, MOCK_RISK_FILTERS } from '../mocks/mockRiskData'

function normalizeRiskFilters(raw: RiskFilterOptions | undefined): RiskFilterOptions {
  return {
    categories: raw?.categories?.length ? raw.categories : MOCK_RISK_FILTERS.categories,
    riskLabel: raw?.riskLabel ?? MOCK_RISK_FILTERS.riskLabel,
    categoryField: raw?.categoryField ?? MOCK_RISK_FILTERS.categoryField,
    responsePlanField: raw?.responsePlanField ?? MOCK_RISK_FILTERS.responsePlanField,
  }
}

export function useRiskFilters() {
  return useQuery<RiskFilterOptions>({
    queryKey: ['riskFilters'],
    queryFn: USE_MOCK
      ? () => Promise.resolve(MOCK_RISK_FILTERS)
      : () => riskApi.getFilters().then(normalizeRiskFilters),
    staleTime: 10 * 60 * 1000,
  })
}

export function useRiskDashboard(params: RiskQueryParams) {
  return useQuery<RiskDashboard>({
    queryKey: ['riskDashboard', params.category],
    queryFn: USE_MOCK
      ? () => Promise.resolve(getMockRiskDashboard(params.category ?? 'all'))
      : () => riskApi.getDashboard(params),
    staleTime: 5 * 60 * 1000,
  })
}

export { USE_MOCK as USE_RISK_MOCK } from '../config/dataSource'
