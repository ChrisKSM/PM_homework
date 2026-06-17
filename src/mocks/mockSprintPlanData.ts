import dayjs from 'dayjs'
import type { SprintDefinition, SprintPlanRow, SprintPlanTimeline } from '../types/sprintPlan'

const BROWSE = 'https://harmony.lge.com:8443/issue/browse'
const FIX_VERSION = 'Release 1.0'

function gateForIr(ir: number): string {
  if (ir <= 1) return 'Gate 0'
  if (ir === 2) return 'Gate 1'
  return 'Gate 2'
}

function sprintStatus(spNum: number, activeSp: number): SprintPlanRow['status'] {
  if (spNum < activeSp) return 'completed'
  if (spNum === activeSp) return 'active'
  return 'future'
}

/** 2026_IR1SP02(1/19-1/30) ~ 2026_IR4SP17(8/17-8/28) — 2주 cadence */
export function buildSprintDefinitions(): SprintDefinition[] {
  const sprints: SprintDefinition[] = []
  let cursor = dayjs('2026-01-19')

  for (let sp = 2; sp <= 17; sp += 1) {
    const ir = Math.floor((sp - 2) / 4) + 1
    const start = cursor
    const end = cursor.add(11, 'day')
    const startDate = start.format('YYYY-MM-DD')
    const endDate = end.format('YYYY-MM-DD')
    const key = `2026_IR${ir}SP${String(sp).padStart(2, '0')}`
    const label = `${key}(${start.format('M/D')}-${end.format('M/D')})`

    sprints.push({
      key,
      label,
      startDate,
      endDate,
      ir,
      gate: gateForIr(ir),
    })

    cursor = cursor.add(14, 'day')
  }

  return sprints
}

const SPRINTS = buildSprintDefinitions()
const sprintByKey = Object.fromEntries(SPRINTS.map((s) => [s.key, s])) as Record<string, SprintDefinition>

function sprintRef(key: string) {
  return sprintByKey[key]
}

function rowFromSprint(
  partial: Omit<SprintPlanRow, 'sprintLabel' | 'startDate' | 'endDate' | 'gate' | 'fixVersion' | 'status'> & {
    sprintKey: string
    status?: SprintPlanRow['status']
  },
): SprintPlanRow {
  const sp = sprintRef(partial.sprintKey)
  const spNum = Number(partial.sprintKey.match(/SP(\d+)$/)?.[1] ?? 0)
  return {
    ...partial,
    fixVersion: FIX_VERSION,
    gate: sp.gate,
    sprintLabel: sp.label,
    startDate: sp.startDate,
    endDate: sp.endDate,
    status: partial.status ?? sprintStatus(spNum, 12),
  }
}

const ENV_R03 = `R-ID : R-03

EMV
- P(%) : 50
- I_일정(일) : 12
- I_공수(MD) : 15
- EMV 일정 : 6.0
- EMV 공수 : 7.5

관련 이슈: MLCSIXZERO-403`

const ENV_R02 = `R-ID : R-02

EMV
- P(%) : 50
- I_일정(일) : 12
- EMV 공수 : 7.5
- EMV 일정 : 6.0

MLCSIXZERO-402 | 변경 전: 50% / 12일 | 변경 후: 40% / 10일 | Δ EMV_일정: −2.0일`

const ENV_R05 = `R-ID : R-05

EMV
- P(%) : 40
- I_일정(일) : 10
- EMV 일정 : 4.0

품질 TC · MLCSIXZERO-405`

const ENV_R01 = `R-ID : R-01

EMV
- P(%) : 60
- I_일정(일) : 14
- EMV 일정 : 8.4

MLCSIXZERO-401 · 요구사항 인입`

const ENV_R06 = `R-ID : R-06

EMV
- P(%) : 30
- I_일정(일) : 8
- EMV 일정 : 2.4

MLCSIXZERO-406 · 범위`

const ROWS: SprintPlanRow[] = [
  rowFromSprint({
    id: 'ep-audio',
    issueType: 'Epic',
    issueKey: 'MLCSIXZERO-120',
    issueUrl: `${BROWSE}/MLCSIXZERO-120`,
    summary: 'Audio Core 개발 Epic',
    labels: [],
    isMvp: false,
    sprintKey: '2026_IR1SP02',
    risks: [],
  }),
  rowFromSprint({
    id: 'st-atmos',
    issueType: 'Story',
    issueKey: 'MLCSIXZERO-201',
    issueUrl: `${BROWSE}/MLCSIXZERO-201`,
    summary: 'Dolby Atmos 하방 기능 구현',
    labels: [],
    isMvp: false,
    epicKey: 'MLCSIXZERO-120',
    sprintKey: '2026_IR1SP04',
    risks: [],
  }),
  rowFromSprint({
    id: 'ep-conn',
    issueType: 'Epic',
    issueKey: 'MLCSIXZERO-130',
    issueUrl: `${BROWSE}/MLCSIXZERO-130`,
    summary: 'Connectivity · ThinQ · webOS 연동 Epic',
    labels: [],
    isMvp: false,
    sprintKey: '2026_IR1SP05',
    risks: [],
  }),
  rowFromSprint({
    id: 'st-system',
    issueType: 'Story',
    issueKey: 'MLCSIXZERO-310',
    issueUrl: `${BROWSE}/MLCSIXZERO-310`,
    summary: 'System Stability · Booting / Performance',
    labels: [],
    isMvp: false,
    epicKey: 'MLCSIXZERO-130',
    sprintKey: '2026_IR2SP06',
    risks: [
      {
        id: 'R-03',
        issueKey: 'MLCSIXZERO-403',
        issueUrl: `${BROWSE}/MLCSIXZERO-403`,
        summary: '[RISK] System 기능 성능 최적화 및 안정화',
        description:
          '대응 전략 : 시스템 개발 인원 재 분배 및 가용 리소스 늘려 대응 할 것\n현재 대응 조치: MLCSIXZERO-403 Performace, Booting , emergency 등 핵심 기능 세분화 확인\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
        environment: ENV_R03,
        markerDate: '2026-03-20',
        category: '자원',
      },
    ],
  }),
  rowFromSprint({
    id: 'st-framework',
    issueType: 'Story',
    issueKey: 'MLCSIXZERO-320',
    issueUrl: `${BROWSE}/MLCSIXZERO-320`,
    summary: 'Audio Framework 포팅 · 기능 통합',
    labels: [],
    isMvp: false,
    epicKey: 'MLCSIXZERO-120',
    sprintKey: '2026_IR2SP08',
    risks: [
      {
        id: 'R-02',
        issueKey: 'MLCSIXZERO-402',
        issueUrl: `${BROWSE}/MLCSIXZERO-402`,
        summary: '[RISK] Audio framework 포팅 지연',
        description:
          '대응 전략 : 개발팀과 긴밀한 소통을 통해 일정 Check, Daily scrum 활동 진행\n현재 대응 조치: MLCSIXZERO-402 개발 진척도 Daily 확인 진행\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
        environment: ENV_R02,
        markerDate: '2026-04-18',
        category: '일정',
      },
    ],
  }),
  rowFromSprint({
    id: 'st-quality',
    issueType: 'Story',
    issueKey: 'MLCSIXZERO-330',
    issueUrl: `${BROWSE}/MLCSIXZERO-330`,
    summary: '품질 TC 조기 수행 · 칩셋 검증',
    labels: [],
    isMvp: false,
    epicKey: 'MLCSIXZERO-120',
    sprintKey: '2026_IR3SP10',
    risks: [
      {
        id: 'R-05',
        issueKey: 'MLCSIXZERO-405',
        issueUrl: `${BROWSE}/MLCSIXZERO-405`,
        summary: '[RISK] 신규 칩셋 검증 범위 · 품질 확보 일정',
        description:
          '대응 전략 : funciton별로 조기 안정화 계획 수립 및 테스트 진행\n현재 대응 조치: MLCSIXZERO-405 자동화 우선 순위 진행\n미래 대응 계획: 정기적인 요구사항 검토 회의 및 이해관계자와의 긴밀한 커뮤니케이션 유지.',
        environment: ENV_R05,
        markerDate: '2026-05-16',
        category: '품질',
      },
    ],
  }),
  rowFromSprint({
    id: 'st-fullfunc',
    issueType: 'Story',
    issueKey: 'MLCSIXZERO-340',
    issueUrl: `${BROWSE}/MLCSIXZERO-340`,
    summary: 'S80C Full function 자가검증',
    labels: [],
    isMvp: false,
    epicKey: 'MLCSIXZERO-120',
    sprintKey: '2026_IR3SP11',
    risks: [
      {
        id: 'R-01',
        issueKey: 'MLCSIXZERO-401',
        issueUrl: `${BROWSE}/MLCSIXZERO-401`,
        summary: '[RISK] Sprint 중 신규 요구사항 인입 (마이버튼)',
        description:
          '대응 전략 : 요구사항 관리 계획 수립 및 정기적인 리뷰\n현재 대응 조치: MLCSIXZERO-401 변경사항 신속 반영\n미래 대응 계획: 이해관계자 커뮤니케이션 유지.',
        environment: ENV_R01,
        markerDate: '2026-05-30',
        category: '요구사항',
      },
    ],
  }),
  rowFromSprint({
    id: 'ep-mvp',
    issueType: 'Epic',
    issueKey: 'MLCSIXZERO-400',
    issueUrl: `${BROWSE}/MLCSIXZERO-400`,
    summary: 'MVP Release · 시험 및 배포 Epic',
    labels: ['MVP', 'risk'],
    isMvp: true,
    sprintKey: '2026_IR4SP16',
    status: 'active',
    risks: [
      {
        id: 'R-06',
        issueKey: 'MLCSIXZERO-406',
        issueUrl: `${BROWSE}/MLCSIXZERO-406`,
        summary: '[RISK] 음장 효과 조합 변별력 · 범위 영향',
        description:
          '대응 전략 : 조합 별 음향 효과 선별 확인\n현재 대응 조치: MLCSIXZERO-406 기능 구현 우선 후 조합 확인\n미래 대응 계획: 이해관계자 커뮤니케이션 유지.',
        environment: ENV_R06,
        markerDate: '2026-08-10',
        category: '범위',
      },
    ],
  }),
  rowFromSprint({
    id: 'st-mvp-release',
    issueType: 'Story',
    issueKey: 'MLCSIXZERO-350',
    issueUrl: `${BROWSE}/MLCSIXZERO-350`,
    summary: 'MVP Release 시험 · 배포 · 일정 준수',
    labels: ['MVP'],
    isMvp: true,
    epicKey: 'MLCSIXZERO-400',
    sprintKey: '2026_IR4SP17',
    status: 'future',
    risks: [],
  }),
]

export const mockSprintPlanTimeline: SprintPlanTimeline = {
  ganttStart: '2026-02-01',
  ganttEnd: '2026-08-31',
  sprintRangeStart: SPRINTS[0].startDate,
  sprintRangeEnd: SPRINTS[SPRINTS.length - 1].endDate,
  sprints: SPRINTS,
  rows: ROWS,
    meta: {
      fixVersionField: 'Release 1.0',
      riskLabel: 'risk',
      totalSprints: SPRINTS.length,
      activeSprint: '2026_IR3SP12',
      jiraBrowseBase: BROWSE,
      dataSource: 'mock',
    },
}
