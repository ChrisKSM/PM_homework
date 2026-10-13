import { releaseCalendarFallback } from '../data/releaseSprintCalendar2026'
import type { ModelReleaseGanttData } from '../types/modelStatusReleaseGantt'

const cal = releaseCalendarFallback()

/** Jira 미연동 시 폴백 — SP01~SP26 캘린더 + 샘플 Epic 구간 */
export const MOCK_RELEASE_EPIC_GANTT: ModelReleaseGanttData = {
  ...cal,
  milestones: [
    { issueKey: 'MS-M1', label: 'M1', sprint: 3 },
    { issueKey: 'MS-M2', label: 'M2', sprint: 6 },
    { issueKey: 'MS-M3', label: 'M3', sprint: 8 },
    { issueKey: 'MS-M4', label: 'M4', sprint: 12 },
    { issueKey: 'MS-M5', label: 'M5', sprint: 15 },
  ],
  epics: [
    {
      issueKey: 'TVPLAT-828657',
      summary: '사전조사-1차 UX/UI 프로토타입',
      color: '#3b82f6',
      startSp: 1,
      endSp: 5,
      milestones: [{ issueKey: 'MS-M1', label: 'M1', sprint: 3 }],
    },
    {
      issueKey: 'TVPLAT-857192',
      summary: '아키텍처-UX/UI 통합 설계',
      color: '#86efac',
      startSp: 3,
      endSp: 12,
      milestones: [
        { issueKey: 'MS-M2', label: 'M2', sprint: 6 },
        { issueKey: 'MS-M3', label: 'M3', sprint: 8 },
      ],
    },
    {
      issueKey: 'TVPLAT-857212',
      summary: 'Backend-네이버 API 연동',
      color: '#059669',
      startSp: 6,
      endSp: 15,
      milestones: [
        { issueKey: 'MS-M4', label: 'M4', sprint: 12 },
        { issueKey: 'MS-M5', label: 'M5', sprint: 15 },
      ],
    },
  ],
}

export function releaseGanttForModel(modelCode: string): ModelReleaseGanttData {
  if (modelCode === 'H7_VI') {
    return {
      ...MOCK_RELEASE_EPIC_GANTT,
      epics: MOCK_RELEASE_EPIC_GANTT.epics.map((e, i) => ({
        ...e,
        issueKey: i === 0 ? 'TVPLAT-943406' : e.issueKey,
        summary: i === 0 ? 'H7 VI Epic (Sound Suite · mock)' : e.summary,
      })),
    }
  }
  return MOCK_RELEASE_EPIC_GANTT
}
