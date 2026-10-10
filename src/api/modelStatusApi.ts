import client from './client'
import type { ModelStatusInitiativeIssue } from '../types/modelStatusInitiative'
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
    const label = initiativeJiraLabelForModel(model)
    return client
      .get<ModelStatusInitiativesResponse>('/model-status/initiatives', {
        params: label ? { model, label } : { model },
      })
      .then((r) => r.data)
  },

  initiativesPing: () =>
    client.get<{ ok: boolean; models: string[] }>('/model-status/initiatives/ping').then((r) => r.data),
}

/** BE Jira label 매핑 (없으면 mock 유지) */
export const MODEL_INITIATIVE_JIRA_MODELS = new Set(Object.keys(MODEL_STATUS_INITIATIVE_JIRA_LABEL))
