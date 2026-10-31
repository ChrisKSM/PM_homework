import { useQuery } from '@tanstack/react-query'
import { modelStatusApi, MODEL_INITIATIVE_JIRA_MODELS } from '../api/modelStatusApi'
import { jiraFetchOrMock } from '../utils/jiraFetch'
import type { ModelStatusStorySpKpiResponse } from '../types/modelStatusStorySpKpi'
import { canonicalModelName } from '../utils/modelScheduleRows'

export function useModelStatusStorySpKpi(modelCode: string, enabled: boolean) {
  const norm = canonicalModelName(modelCode)
  const useLive = MODEL_INITIATIVE_JIRA_MODELS.has(norm)

  return useQuery({
    queryKey: ['modelStatusStorySpKpi', norm],
    enabled: enabled && useLive,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await jiraFetchOrMock(
        () => modelStatusApi.getStorySpKpi(norm),
        null,
      )
      return res as ModelStatusStorySpKpiResponse | null
    },
  })
}
