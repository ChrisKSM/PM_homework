import client from './client'
import type { ModelStatusInitiativeIssue } from '../types/modelStatusInitiative'
import type { ModelReleaseGanttResponse } from '../types/modelStatusReleaseGantt'
import {
  initiativeJiraLabelForModel,
  MODEL_STATUS_INITIATIVE_JIRA_LABEL,
} from '../data/modelStatusInitiativeJiraLabels'

export interface ModelStatusInitiativesResponse {
  meta: {
    jql: string
    model?: string | null
    label: string
    projectKey: string
    total: number
    asOf: string
    jiraBaseUrl?: string
  }
  issues: ModelStatusInitiativeIssue[]
}

export const modelStatusApi = {
  getInitiatives: (model: string) => {
    const label =
      initiativeJiraLabelForModel(model) ??
      (model === 'H7_VI' ? MODEL_STATUS_INITIATIVE_JIRA_LABEL.H7_VI : undefined)
    // BE·구 FE 호환: label 없이 model=H7_VI 만 보내면 400 — 항상 label 포함
    const params: { model: string; label?: string } = { model }
    if (label) params.label = label
    return client
      .get<ModelStatusInitiativesResponse>('/model-status/initiatives', { params })
      .then((r) => r.data)
  },

  initiativesPing: () =>
    client.get<{ ok: boolean; models: string[] }>('/model-status/initiatives/ping').then((r) => r.data),

  getReleaseGantt: (model: string, initiativeKey?: string, refresh = false) => {
    const label =
      initiativeJiraLabelForModel(model) ??
      (model === 'H7_VI' ? MODEL_STATUS_INITIATIVE_JIRA_LABEL.H7_VI : undefined)
    const params: { model: string; label?: string; initiative_key?: string; refresh?: boolean } = {
      model,
    }
    if (label) params.label = label
    if (initiativeKey) params.initiative_key = initiativeKey
    if (refresh) params.refresh = true
    return client
      .get<ModelReleaseGanttResponse>('/model-status/release/gantt', { params })
      .then((r) => r.data)
  },

  getReleaseCalendar: () =>
    client.get<ModelReleaseGanttResponse['calendar']>('/model-status/release/calendar').then((r) => r.data),
}

/** BE Jira label 매핑 (없으면 mock 유지) */
export const MODEL_INITIATIVE_JIRA_MODELS = new Set(Object.keys(MODEL_STATUS_INITIATIVE_JIRA_LABEL))
