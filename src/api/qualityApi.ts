import client from './client'
import type { QualityDashboard, QualityFilterOptions, QualityQueryParams, QualityAiAnalysis } from '../types/quality'

function buildParams(params?: QualityQueryParams) {
  if (!params) return undefined
  const q: Record<string, string> = {}
  if (params.event) q.event = params.event
  if (params.phase) q.phase = params.phase
  if (params.category && params.category !== 'all') q.category = params.category
  return Object.keys(q).length ? q : undefined
}

export const qualityApi = {
  getFilters: () =>
    client.get<QualityFilterOptions>('/quality/filters').then((r) => r.data),

  getDashboard: (params?: QualityQueryParams) =>
    client
      .get<QualityDashboard>('/quality/dashboard', { params: buildParams(params) })
      .then((r) => r.data),

  getAiAnalysis: (params?: QualityQueryParams) =>
    client
      .post<QualityAiAnalysis>('/quality/ai-analysis', null, { params: buildParams(params) })
      .then((r) => r.data),
}

export type { QualityQueryParams }
