import { useQuery } from '@tanstack/react-query'
import { modelStatusApi, MODEL_INITIATIVE_JIRA_MODELS } from '../api/modelStatusApi'
import { jiraFetchOrMock } from '../utils/jiraFetch'
import type { ModelStatusInitiativeIssue } from '../types/modelStatusInitiative'
import { canonicalModelName } from '../utils/modelScheduleRows'

export function useModelStatusInitiatives(modelCode: string, enabled: boolean) {
  const norm = canonicalModelName(modelCode)
  const useLive = MODEL_INITIATIVE_JIRA_MODELS.has(norm)

  return useQuery({
    queryKey: ['modelStatusInitiatives', norm],
    enabled: enabled && useLive,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await jiraFetchOrMock(
        () => modelStatusApi.getInitiatives(norm),
        {
          meta: { jql: '', label: '', projectKey: 'TVPLAT', total: 0, asOf: '' },
          issues: [],
        },
      )
      return res
    },
    select: (data) => ({
      issues: data.issues as ModelStatusInitiativeIssue[],
      meta: data.meta,
      source: useLive ? ('jira' as const) : ('mock' as const),
    }),
  })
}
