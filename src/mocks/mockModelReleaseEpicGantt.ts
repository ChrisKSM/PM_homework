import type { ModelReleaseGanttData } from '../types/modelStatusReleaseGantt'

/** 7.5.3 일정 대시보드 레퍼런스 — Epic 실행 구간 · M1~M5 */
export const MOCK_RELEASE_EPIC_GANTT: ModelReleaseGanttData = {
  sprintMin: 2,
  sprintMax: 15,
  irBands: [
    { id: 'ir1', title: '1차 릴리즈 (IR1 MVP)', subtitle: 'SP02 ~ SP05', sprintFrom: 2, sprintTo: 5 },
    { id: 'ir2', title: '2차 릴리즈 (IR2 실연동)', subtitle: 'SP06 ~ SP10', sprintFrom: 6, sprintTo: 10 },
    { id: 'ir3', title: '3차 릴리즈 (IR3 FINAL)', subtitle: 'SP11 ~ SP15', sprintFrom: 11, sprintTo: 15 },
  ],
  milestones: [
    { id: 'M1', label: 'M1', sprint: 3 },
    { id: 'M2', label: 'M2', sprint: 6 },
    { id: 'M3', label: 'M3', sprint: 8 },
    { id: 'M4', label: 'M4', sprint: 12 },
    { id: 'M5', label: 'M5', sprint: 15 },
  ],
  epics: [
    {
      issueKey: 'TVPLAT-828657',
      summary: '사전조사-1차 UX/UI 프로토타입',
      color: '#3b82f6',
      startSp: 2,
      endSp: 5,
    },
    {
      issueKey: 'TVPLAT-857192',
      summary: '아키텍처-UX/UI 통합 설계',
      color: '#86efac',
      startSp: 4,
      endSp: 12,
    },
    {
      issueKey: 'TVPLAT-857200',
      summary: '네이버 기술 제휴·API 협의',
      color: '#a78bfa',
      startSp: 4,
      endSp: 9,
    },
    {
      issueKey: 'TVPLAT-857212',
      summary: 'Backend-네이버 API 연동',
      color: '#059669',
      startSp: 6,
      endSp: 15,
    },
    {
      issueKey: 'TVPLAT-857220',
      summary: '내부 임직원 테스트-결과 보고',
      color: '#f97316',
      startSp: 11,
      endSp: 15,
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
        summary: i === 0 ? 'H7 VI Initiative Epic (Sound Suite)' : e.summary,
      })),
    }
  }
  return MOCK_RELEASE_EPIC_GANTT
}
