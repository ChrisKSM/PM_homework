import type {
  ProcurementDashboard,
  ProcurementFilterOptions,
  ProcurementPhaseId,
  ProcurementVendorId,
} from '../types/procurement'

export const MOCK_PROCUREMENT_FILTERS: ProcurementFilterOptions = {
  vendors: [
    { id: 'all', label: '전체', jiraLabel: '' },
    { id: 'mcs', label: 'MCS', jiraLabel: 'Vendor_MCS' },
    { id: 'tonly', label: 'Tonly', jiraLabel: 'Vendor_Tonly' },
    { id: 'ite', label: 'ITE', jiraLabel: 'Vendor_ITE' },
    { id: 'actions', label: 'Actions', jiraLabel: 'Vendor_Actions' },
  ],
  phases: [
    { id: 'all', label: '전체 단계', jiraLabel: '' },
    { id: 'plan', label: '계획', jiraLabel: 'PROC_PLAN' },
    { id: 'contract', label: '계약', jiraLabel: 'CONTRACT' },
    { id: 'signed', label: '체결', jiraLabel: 'SIGNED' },
    { id: 'execute', label: '수행', jiraLabel: 'PROC_EXECUTE' },
    { id: 'verified', label: '검증완료', jiraLabel: 'VERIFIED' },
    { id: 'close', label: '종료', jiraLabel: 'PROC_CLOSE' },
  ],
}

const MOCK_ISSUE_BASE = 'https://harmony.lge.com:8443/issue/browse'

const BASE_MOCK: ProcurementDashboard = {
  meta: {
    vendor: 'all',
    phase: 'all',
    jql: 'issuetype = Request AND labels = PROCUREMENT',
    boardId: 12641,
    asOf: '2026-05-20',
  },
  summary: { total: 37, signed: 9, verified: 6, open: 3 },
  kpis: [
    {
      id: 'contract',
      label: '계약 이행률',
      target: '100%',
      targetNum: 100,
      actualPct: 90,
      numerator: 9,
      denominator: 10,
      formula: 'CONTRACT 또는 SIGNED label 보유 Request / 조달 대상 Request 전체',
      met: false,
    },
    {
      id: 'delivery',
      label: '납기 준수율',
      target: '95% 이상',
      targetNum: 95,
      actualPct: 92,
      numerator: 34,
      denominator: 37,
      formula: 'statusCategory = Done인 Request / 조달 Request 전체 (due date 미사용)',
      met: false,
    },
    {
      id: 'quality',
      label: '품질 충족률',
      target: '100%',
      targetNum: 100,
      actualPct: 100,
      numerator: 6,
      denominator: 6,
      formula: 'VERIFIED label 보유 Request / SIGNED(체결) Request',
      met: true,
    },
    {
      id: 'risk',
      label: '리스크 조기 대응률',
      target: '100%',
      targetNum: 100,
      actualPct: 100,
      numerator: 8,
      denominator: 8,
      formula: 'P1/P2 미결 Bug 중 대응계획 입력 / P1/P2 미결 전체',
      met: true,
    },
  ],
  statusItems: [
    {
      item: 'FW 배포',
      vendor: 'MCS',
      vendorLabel: 'Vendor_MCS',
      contractLabel: 'SIGNED',
      progress: '정상',
      dodStatus: 'FW 패키지 빌드\n배포 검증\n릴리즈 노트',
      dodDetail: 'FW 패키지 빌드\n배포 검증\n릴리즈 노트',
      risk: '—',
    },
    {
      item: 'Tonly 검증',
      vendor: 'Tonly',
      vendorLabel: 'Vendor_Tonly',
      contractLabel: 'SIGNED',
      progress: '정상',
      dodStatus: 'Spec v2.1 검토\nRF 측정\n인증 서류',
      dodDetail: 'Spec v2.1 검토\nRF 측정\n인증 서류',
      risk: '—',
    },
    {
      item: 'Main SoC FW',
      vendor: 'MCS',
      vendorLabel: 'Vendor_MCS',
      contractLabel: 'SIGNED',
      progress: '정상',
      dodStatus: '기능 TC 통과\n성능 ±5%\n회귀 테스트',
      dodDetail: '기능 TC 통과\n성능 ±5%\n회귀 테스트',
      risk: '—',
    },
    {
      item: 'BT/Wireless FW',
      vendor: 'Tonly',
      vendorLabel: 'Vendor_Tonly',
      contractLabel: 'CONTRACT',
      progress: '주의',
      dodStatus: 'Dolby Atmos 인증\nWireless RF 측정',
      dodDetail: 'Dolby Atmos 인증\nWireless RF 측정',
      risk: 'Dolby Atmos 3월',
    },
    {
      item: 'HDMI FW',
      vendor: 'ITE',
      vendorLabel: 'Vendor_ITE',
      contractLabel: 'SIGNED',
      progress: '정상',
      dodStatus: 'HDMI 2.1 기능\nEDID 검증\n성능 TC',
      dodDetail: 'HDMI 2.1 기능\nEDID 검증\n성능 TC',
      risk: '—',
    },
    {
      item: '시험 리포트',
      vendor: 'Actions',
      vendorLabel: 'Vendor_Actions',
      contractLabel: 'VERIFIED',
      progress: '완료',
      dodStatus: '시험 완료\n기준 충족\n리뷰 승인',
      dodDetail: '시험 완료\n기준 충족\n리뷰 승인',
      risk: '—',
    },
  ],
  pipeline: [
    { phase: '계획', label: 'PROC_PLAN', count: 12 },
    { phase: '계약', label: 'CONTRACT', count: 10 },
    { phase: '체결', label: 'SIGNED', count: 9 },
    { phase: '수행', label: 'PROC_EXECUTE', count: 8 },
    { phase: '검증완료', label: 'VERIFIED', count: 6 },
    { phase: '종료', label: 'PROC_CLOSE', count: 2 },
  ],
  schedule: [
    {
      item: 'Main SoC FW',
      start: '2026.01',
      end: '2026.06',
      milestone: '2026.03',
      current: 'Sprint 3/11',
      status: '정상',
    },
    {
      item: 'BT/Wireless FW',
      start: '2026.01',
      end: '2026.06',
      milestone: '2026.03',
      current: 'Sprint 3/11',
      status: '주의',
    },
    {
      item: 'HDMI FW',
      start: '2026.01',
      end: '2026.06',
      milestone: '2026.03',
      current: 'Sprint 3/11',
      status: '정상',
    },
    {
      item: '검증 TC 및 결과',
      start: '2026.01',
      end: '2026.06',
      milestone: '2026.03',
      current: 'Sprint 3/11',
      status: '정상',
    },
    {
      item: '시험 리포트',
      start: '2024.07',
      end: '2024.07',
      milestone: '2024.07',
      current: '완료',
      status: '완료',
    },
  ],
  acceptance: [
    {
      item: 'Main SoC FW',
      criteria: '기능 동작 · 성능 ±5%',
      method: '품질 TC · 기능 테스트',
      targetDate: '2026.03',
      verifiedCount: 2,
      totalCount: 4,
      status: '주의',
    },
    {
      item: 'BT/Wireless FW',
      criteria: 'Spec v2.1',
      method: '사양 검토 · 성능 지표',
      targetDate: '2026.03',
      verifiedCount: 3,
      totalCount: 3,
      status: '정상',
    },
    {
      item: 'HDMI FW',
      criteria: '기능 동작 · 성능 ±5%',
      method: '품질 TC · 성능 지표',
      targetDate: '2026.03',
      verifiedCount: 1,
      totalCount: 2,
      status: '주의',
    },
    {
      item: '시험 리포트',
      criteria: '시험 완료 · 기준 충족',
      method: '리뷰',
      targetDate: '2024.27',
      verifiedCount: 1,
      totalCount: 1,
      status: '완료',
    },
  ],
  monitoring: [
    {
      date: '2026.02.10',
      category: '일정',
      verdict: '일부 지연',
      note: 'Dolby Atmos 인증 일정 3월로 조정',
      vendor: 'Vendor_Tonly',
    },
    {
      date: '2026.04.02',
      category: '품질',
      verdict: '충족',
      note: '품질 충족률 100% 유지',
      vendor: '전체',
    },
  ],
  requests: [
    {
      issueKey: 'MLCSIXZERO-501',
      issueUrl: `${MOCK_ISSUE_BASE}/MLCSIXZERO-501`,
      vendor: 'MCS',
      vendorLabel: 'Vendor_MCS',
      summary: 'Main SoC FW v2.3',
      phaseLabel: 'SIGNED',
      dueDate: null,
      status: 'In Progress',
      health: '정상',
    },
    {
      issueKey: 'MLCSIXZERO-502',
      issueUrl: `${MOCK_ISSUE_BASE}/MLCSIXZERO-502`,
      vendor: 'Tonly',
      vendorLabel: 'Vendor_Tonly',
      summary: 'BT Spec v2.1 검증',
      phaseLabel: 'CONTRACT',
      dueDate: null,
      status: 'Open',
      health: '주의',
    },
    {
      issueKey: 'MLCSIXZERO-503',
      issueUrl: `${MOCK_ISSUE_BASE}/MLCSIXZERO-503`,
      vendor: 'ITE',
      vendorLabel: 'Vendor_ITE',
      summary: 'HDMI FW 성능 TC',
      phaseLabel: 'SIGNED',
      dueDate: null,
      status: 'In Progress',
      health: '정상',
    },
    {
      issueKey: 'MLCSIXZERO-504',
      issueUrl: `${MOCK_ISSUE_BASE}/MLCSIXZERO-504`,
      vendor: 'Actions',
      vendorLabel: 'Vendor_Actions',
      summary: '시험 리포트 리뷰',
      phaseLabel: 'VERIFIED',
      dueDate: '2024-07-15',
      status: 'Done',
      health: '완료',
    },
    {
      issueKey: 'MLCSIXZERO-505',
      issueUrl: `${MOCK_ISSUE_BASE}/MLCSIXZERO-505`,
      vendor: 'MCS',
      vendorLabel: 'Vendor_MCS',
      summary: 'FW 배포 패키지',
      phaseLabel: 'SIGNED',
      dueDate: null,
      status: 'Done',
      health: '완료',
    },
    {
      issueKey: 'MLCSIXZERO-506',
      issueUrl: `${MOCK_ISSUE_BASE}/MLCSIXZERO-506`,
      vendor: 'Tonly',
      vendorLabel: 'Vendor_Tonly',
      summary: 'Wireless RF 측정',
      phaseLabel: 'SIGNED',
      dueDate: null,
      status: 'In Progress',
      health: '정상',
    },
  ],
}

function buildJql(vendor: ProcurementVendorId, phase: ProcurementPhaseId): string {
  let jql = 'issuetype = Request AND labels = PROCUREMENT'
  const v = MOCK_PROCUREMENT_FILTERS.vendors.find((x) => x.id === vendor)
  const p = MOCK_PROCUREMENT_FILTERS.phases.find((x) => x.id === phase)
  if (v?.jiraLabel) jql += ` AND labels = ${v.jiraLabel}`
  if (p?.jiraLabel) jql += ` AND labels = ${p.jiraLabel}`
  return jql
}

function filterByVendor<T extends { vendorLabel: string }>(rows: T[], vendor: ProcurementVendorId): T[] {
  if (vendor === 'all') return rows
  const jl = MOCK_PROCUREMENT_FILTERS.vendors.find((v) => v.id === vendor)?.jiraLabel
  if (!jl) return rows
  return rows.filter((r) => r.vendorLabel === jl)
}

export function getMockProcurementDashboard(
  vendor: ProcurementVendorId = 'all',
  phase: ProcurementPhaseId = 'all'
): ProcurementDashboard {
  const requests = filterByVendor(BASE_MOCK.requests, vendor)
  const statusItems = filterByVendor(BASE_MOCK.statusItems, vendor)

  return {
    ...BASE_MOCK,
    meta: {
      ...BASE_MOCK.meta,
      vendor,
      phase,
      jql: buildJql(vendor, phase),
    },
    summary: {
      ...BASE_MOCK.summary,
      total: vendor === 'all' ? BASE_MOCK.summary.total : requests.length,
    },
    statusItems: vendor === 'all' ? BASE_MOCK.statusItems : statusItems,
    requests,
  }
}
