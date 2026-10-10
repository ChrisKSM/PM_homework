import { useQuery } from '@tanstack/react-query'
import { modelStatusApi, MODEL_INITIATIVE_JIRA_MODELS } from '../api/modelStatusApi'
import { releaseGanttForModel } from '../mocks/mockModelReleaseEpicGantt'
import { jiraFetchOrMock } from '../utils/jiraFetch'
import type { ModelReleaseGanttData } from '../types/modelStatusReleaseGantt'
import { canonicalModelName } from '../utils/modelScheduleRows'

function toGanttData(
  live: Awaited<ReturnType<typeof modelStatusApi.getReleaseGantt>> | null,
  fallback: ModelReleaseGanttData,
): ModelReleaseGanttData {
  if (!live?.calendar) return fallback
  const headerMs = live.milestones?.length ? live.milestones : fallback.milestones
  const epics = live.epics?.length ? live.epics : fallback.epics
  return {
    sprintMin: live.calendar.sprintMin,
    sprintMax: live.calendar.sprintMax,
    irBands: live.calendar.irBands,
    sprints: live.calendar.sprints,
    milestones: headerMs,
    epics,
  }
}

export function useModelStatusReleaseGantt(modelCode: string, enabled: boolean) {
  const norm = canonicalModelName(modelCode)
  const useLive = MODEL_INITIATIVE_JIRA_MODELS.has(norm)
  const fallback = releaseGanttForModel(norm)

  return useQuery({
    queryKey: ['modelStatusReleaseGantt', norm],
    enabled: enabled && useLive,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await jiraFetchOrMock(() => modelStatusApi.getReleaseGantt(norm), null)
      return {
        gantt: toGanttData(res, fallback),
        meta: res?.meta ?? null,
        initiative: res?.initiative ?? null,
        source: res ? ('jira' as const) : ('mock' as const),
      }
    },
    placeholderData: {
      gantt: fallback,
      meta: null,
      initiative: null,
      source: 'mock' as const,
    },
  })
}
