import client from './client'
import type { ModelStatusInitiativeIssue } from '../types/modelStatusInitiative'

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
  getInitiatives: (model: string) =>
    client
      .get<ModelStatusInitiativesResponse>('/model-status/initiatives', {
        params: { model },
      })
      .then((r) => r.data),

  initiativesPing: () =>
    client.get<{ ok: boolean; models: string[] }>('/model-status/initiatives/ping').then((r) => r.data),
}

/** BE Jira label 매핑 (없으면 mock 유지) */
export const MODEL_INITIATIVE_JIRA_MODELS = new Set(['H7_VI'])
