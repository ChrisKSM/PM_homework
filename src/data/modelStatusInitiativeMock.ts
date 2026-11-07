import type { ModelStatusInitiativeIssue } from '../types/modelStatusInitiative'

const SEEDS: Omit<ModelStatusInitiativeIssue, 'key' | 'status'>[] = [
  {
    summary: 'webOS Audio 플랫폼 개발 (webOS 26 MR1) - Audio Platform',
    due: '2026-03-31',
    assignee: '홍길동 / gildong.hong',
    product: 'Soundbar',
    event: 'Initial',
    pm: '김PM / pm.kim',
    model: 'S80C',
  },
  {
    summary: 'Sound Suite Wi-Fi MR9 검증 대응',
    due: '2026-04-15',
    assignee: '이마을 / maeul.lee',
    product: 'Sound Suite',
    event: 'MR9',
    pm: '조성연 / seongyeon.jo',
    model: 'H7_VI',
  },
  {
    summary: 'H5 Dolby Atmos DAFC 튜닝',
    due: '2026-02-28',
    assignee: '박윤규 / yungyu.park',
    product: 'Sound Suite',
    event: 'FC',
    pm: '조성연 / seongyeon.jo',
    model: 'H5',
  },
  {
    summary: 'S90C Wi-Fi 연동 안정화',
    due: '2026-05-01',
    assignee: '김로경 / rokyung.kim',
    product: 'Audio_Soundbar',
    event: 'N/A',
    pm: '김승화 / seunghwa.kim',
    model: 'S90C',
  },
  {
    summary: 'Connect Box 멀티 연동 SW',
    due: '2026-06-30',
    assignee: '미배정',
    product: 'Soundbar',
    event: 'Initial',
    pm: '김PM / pm.kim',
    model: 'S80C',
  },
  {
    summary: 'ThinQ Soundbar 앱 S95TR Android SDK 36',
    due: '2026-04-20',
    assignee: '최개발 / dev.choi',
    product: 'Soundbar',
    event: 'MR8',
    pm: '김승화 / seunghwa.kim',
    model: 'S80C',
  },
  {
    summary: 'M7_VI 2.1.1 DAFC 검증',
    due: '2026-07-15',
    assignee: '이마을 / maeul.lee',
    product: 'Sound Suite',
    event: 'PV',
    pm: '박윤규 / yungyu.park',
    model: 'M7_VI',
  },
]

const STATUS_PLAN: Array<{ status: ModelStatusInitiativeIssue['status']; n: number }> = [
  { status: 'Delivered', n: 37 },
  { status: 'Closed', n: 31 },
  { status: 'In Progress', n: 15 },
  { status: 'DRAFTING', n: 4 },
  { status: 'Suspended', n: 3 },
  { status: 'ELT REVIEW', n: 3 },
  { status: 'Deferred', n: 2 },
]

function buildMock(): ModelStatusInitiativeIssue[] {
  const rows: ModelStatusInitiativeIssue[] = []
  let id = 518777
  for (const { status, n } of STATUS_PLAN) {
    for (let i = 0; i < n; i++) {
      const seed = SEEDS[rows.length % SEEDS.length]
      rows.push({
        ...seed,
        key: `TVPLAT-${id}`,
        status,
        summary: i === 0 ? seed.summary : `${seed.summary}`,
      })
      id += 1
    }
  }
  return rows
}

/** Initiative mock 95건 — 첨부 UI 상태 카드 합계 */
export const MODEL_STATUS_INITIATIVE_ALL: ModelStatusInitiativeIssue[] = buildMock()
