import { useQuery } from '@tanstack/react-query'
import { modelStatusApi, MODEL_SPRINT_JIRA_MODELS } from '../api/modelStatusApi'
import { jiraFetchOrMock } from '../utils/jiraFetch'
import { canonicalModelName } from '../utils/modelScheduleRows'
import type { ModelStatusSprintResponse } from '../types/modelStatusSprint'
import {
  mockBurndown,
  mockSprintSummary,
  mockSprintIssues,
  mockTeamWorkload,
  mockVelocity,
} from '../mocks/mockData'

const emptyMock: ModelStatusSprintResponse = {
  meta: { label: '', scope: 'mock' },
  summary: mockSprintSummary,
  burndown: mockBurndown,
  velocity: mockVelocity,
  workload: mockTeamWorkload,
  issues: mockSprintIssues,
  alerts: [],
}

export function useModelStatusSprint(modelCode: string, enabled: boolean) {
  const norm = canonicalModelName(modelCode)
  const useLive = MODEL_SPRINT_JIRA_MODELS.has(norm)

  return useQuery({
    queryKey: ['modelStatusSprint', norm],
    enabled: enabled && Boolean(norm),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!useLive) {
        return {
          ...emptyMock,
          meta: { ...emptyMock.meta, model: norm, label: norm, scope: 'mock-unmapped' },
        }
      }
      const res = await jiraFetchOrMock(
        () => modelStatusApi.getSprintDashboard(norm),
        null,
      )
      if (!res) {
        return {
          ...emptyMock,
          meta: { ...emptyMock.meta, model: norm, scope: 'mock-fallback' },
        }
      }
      return res
    },
    placeholderData: {
      ...emptyMock,
      meta: { ...emptyMock.meta, model: norm, scope: 'placeholder' },
    },
  })
}
