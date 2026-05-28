import client from './client'
import type { RiskDashboard, RiskFilterOptions, RiskQueryParams } from '../types/risk'

function buildParams(params?: RiskQueryParams) {
  if (!params) return undefined
  const q: Record<string, string> = {}
  if (params.category && params.category !== 'all') q.category = params.category
  return Object.keys(q).length ? q : undefined
}

export const riskApi = {
  getFilters: () => client.get<RiskFilterOptions>('/risk/filters').then((r) => r.data),

  getDashboard: (params?: RiskQueryParams) =>
    client.get<RiskDashboard>('/risk/dashboard', { params: buildParams(params) }).then((r) => r.data),
}

export type { RiskQueryParams }
