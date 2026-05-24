import client from './client'
import type {
  ProcurementDashboard,
  ProcurementFilterOptions,
  ProcurementQueryParams,
} from '../types/procurement'

function buildParams(params?: ProcurementQueryParams) {
  if (!params) return undefined
  const q: Record<string, string> = {}
  if (params.vendor) q.vendor = params.vendor
  if (params.phase && params.phase !== 'all') q.phase = params.phase
  return Object.keys(q).length ? q : undefined
}

export const procurementApi = {
  getFilters: () =>
    client.get<ProcurementFilterOptions>('/procurement/filters').then((r) => r.data),

  getDashboard: (params?: ProcurementQueryParams) =>
    client
      .get<ProcurementDashboard>('/procurement/dashboard', { params: buildParams(params) })
      .then((r) => r.data),
}

export type { ProcurementQueryParams }
