/** TVPLAT-607580 Initiative Template (DRAFTING 작성 가이드) 기반 필드 정의 */

export const JIRA_BASE_URL = 'http://jira.lge.com/issue'
export const INITIATIVE_TEMPLATE_KEY = 'TVPLAT-607580'

export const INITIATIVE_OPTIONS = {
  grouping: ['Required', 'Desired', 'Nice To Have'],
  categorization: ['Product', 'PoC', 'Productivity', 'Others', 'Governing', 'Operation'],
  futurePreparation: ['NA', 'TRM Linked', 'Developer Initiated', 'Capacity Building'],
  developmentScope: ['Device', 'BSP', 'Server', 'Downloadable App', 'Mobile App', 'SDK', 'NA'],
  socDependency: ['NA', 'SIC', 'RTK', 'MTK', 'ETC', 'ALL'],
  scopeOfChange: ['NA', 'Architectural change', 'Non local change', 'Local change'],
  srsRequired: ['유지', '신규', '변경', '삭제'],
  estimatedEffort: ['Small', 'Medium', 'Large', 'Extra Large', 'Extra Extra Large'],
  controllabilityRisk: ['Minimal', 'Moderate', 'High', 'Ultra_High'],
  branch: ['NA', '@webos4tv', 'webOS26 @branch', 'webOS25 @ptl4tv', 'webOS24 @obr4tv'],
  renewProgram: ['X', 'O'],
} as const

export type ReviewStage = 'po' | 'elt'

export type InitiativeFieldId =
  | 'summary'
  | 'assignee'
  | 'fixVersion'
  | 'grouping'
  | 'categorization'
  | 'futurePreparation'
  | 'whyWhat'
  | 'releaseSprint'
  | 'dueDate'
  | 'developmentScope'
  | 'socDependency'
  | 'scopeOfChange'
  | 'srsRequired'
  | 'estimatedEffort'
  | 'controllabilityRisk'
  | 'components'
  | 'branch'
  | 'renewProgram'
  | 'techScope'
  | 'milestone'
  | 'designImpact'
  | 'riskRequest'
  | 'testPlan'

export interface InitiativeFieldGuide {
  id: InitiativeFieldId
  label: string
  /** 템플릿 2개 DRAFTING 블록: 앞쪽은 PO Review, 뒤쪽은 ELT Review 전까지 */
  stage: ReviewStage
  jiraField: string
  guide: string
  options?: { value: string; desc: string }[]
}

export const FIELD_GUIDES: Record<InitiativeFieldId, InitiativeFieldGuide> = {
  summary: {
    id: 'summary',
    label: 'Summary',
    stage: 'po',
    jiraField: 'summary',
    guide:
      '개발 과제의 내용/목적이 명확히 드러나게 작성. 대괄호 [ ] 금지 — 예외: [RMS 1234] / [PRD 1234] 요구사항 prefix, 연구소·실 구분 태그(예: [SEETV]). suffix: (Phase - 1/N), (대표), (약식).',
  },
  assignee: {
    id: 'assignee',
    label: 'Assignee (Initiative Owner)',
    stage: 'po',
    jiraField: 'assignee',
    guide: 'INITIATIVE REPORTER가 우선 선정하고 PO Review와 ELT Review를 거쳐 확정한다.',
  },
  fixVersion: {
    id: 'fixVersion',
    label: 'Fix Version/s',
    stage: 'po',
    jiraField: 'fixVersions',
    guide:
      '개발 산출물을 적용하는 webOS 플랫폼. Initial(이니셜 제품 개발 반영) / MRs(이니셜 출시 후 반영, Running Change 포함) 구분. 제품화 개발이 아니면 webOS TV X.X.',
  },
  grouping: {
    id: 'grouping',
    label: 'Grouping (우선순위)',
    stage: 'po',
    jiraField: 'customfield_35455',
    guide: '고객 가치와 비즈니스 관점에서 우선순위를 3개 중 1개 선택.',
    options: [
      { value: 'Required', desc: '꼭 필요 — 개발하지 않으면 제품 출시에 큰 문제' },
      { value: 'Desired', desc: '필요하나 제품화에 크리티컬하지 않음' },
      { value: 'Nice To Have', desc: '당장 필요하지 않으나 개발하면 좋음' },
    ],
  },
  categorization: {
    id: 'categorization',
    label: 'Categorization',
    stage: 'po',
    jiraField: 'customfield_35516',
    guide: 'Product 선택 시 SRS·Branch·Risk·Test Plan 등이 필수가 된다.',
    options: [
      { value: 'Product', desc: '제품 적용 개발 (Device / Server / App 수정)' },
      { value: 'PoC', desc: '제품 적용 전 사전 검토, 가능성 검토' },
      { value: 'Productivity', desc: '업무 효율화/자동화 등 생산성 향상' },
      { value: 'Others', desc: '분류가 어려운 경우 (향후 변경)' },
      { value: 'Governing', desc: '내가 직접 참여하지 않는 업무' },
      { value: 'Operation', desc: '내가 직접 참여하는 업무' },
    ],
  },
  futurePreparation: {
    id: 'futurePreparation',
    label: 'Future Preparation',
    stage: 'po',
    jiraField: 'customfield_37099',
    guide: '미래 준비 영역 과제 구분.',
    options: [
      { value: 'NA', desc: '해당 없음' },
      { value: 'TRM Linked', desc: 'TRM과 연계된 과제' },
      { value: 'Developer Initiated', desc: 'PoC·성능·보안·Crash 개선 등 자체 발의' },
      { value: 'Capacity Building', desc: '개발자 역량 강화 활동' },
    ],
  },
  whyWhat: {
    id: 'whyWhat',
    label: 'Why & What (고객 가치 · 피처 상세)',
    stage: 'po',
    jiraField: 'customfield_37111',
    guide:
      '고객 가치와 비즈니스 케이스(발의 목적, 업계 추세, 고객 관점 가치)와 피처 상세(사용자 관점, 기존 대비 이점)를 기술.',
  },
  releaseSprint: {
    id: 'releaseSprint',
    label: 'Release Sprint',
    stage: 'elt',
    jiraField: 'customfield_35517',
    guide:
      '과제 완료 가능 일정을 Sprint로 표시. ELT Review에서 1차 예측, 변경은 조직책임자 승인 후 완료 -1 Sprint 시작 전(Due Date 4주 전)까지.',
  },
  dueDate: {
    id: 'dueDate',
    label: 'Due Date',
    stage: 'elt',
    jiraField: 'duedate',
    guide: 'Release Sprint와 일치. Release Sprint 변경 시 Due Date도 함께 수정한다.',
  },
  developmentScope: {
    id: 'developmentScope',
    label: 'Development Scope',
    stage: 'elt',
    jiraField: 'customfield_36694',
    guide: 'SW 변경점이 발생하는 범위 (다중 선택).',
    options: [
      { value: 'Device', desc: 'EPK 파일에 변경점' },
      { value: 'BSP', desc: 'BSP 변경 (Device도 함께 선택)' },
      { value: 'Server', desc: 'Server 변경' },
      { value: 'Downloadable App', desc: 'EPK 수정 없이 TV 다운로드 App 변경' },
      { value: 'Mobile App', desc: 'ThinQ 등 모바일 App 변경' },
      { value: 'SDK', desc: 'SDK 변경' },
      { value: 'NA', desc: 'SW 변경 없음 (제품 미적용 과제)' },
    ],
  },
  socDependency: {
    id: 'socDependency',
    label: 'SoC Dependency',
    stage: 'elt',
    jiraField: 'customfield_36038',
    guide: 'Development Scope에 BSP가 있으면 수정이 필요한 업체 선택, 아니면 NA.',
  },
  scopeOfChange: {
    id: 'scopeOfChange',
    label: 'Scope of Change',
    stage: 'elt',
    jiraField: 'scopeOfChange',
    guide: '변경 영향도에 대한 Owner 의견. 아키텍트가 최종 결정하며 NA가 아니면 ARCH REVIEW 진행.',
    options: [
      { value: 'Architectural change', desc: '신규 모듈 생성' },
      { value: 'Non local change', desc: '기존 모듈 변경 + 외부 모듈 영향' },
      { value: 'Local change', desc: '기존 모듈 변경, 외부 영향 없음' },
      { value: 'NA', desc: '설계 활동 제외 (2nd Arch Review 생략)' },
    ],
  },
  srsRequired: {
    id: 'srsRequired',
    label: 'SRS 작성 필요 여부',
    stage: 'elt',
    jiraField: 'customfield_35541',
    guide: '고객 관점 변경이 있으면 반드시 업데이트. 신규(New) / 변경(Need Update) / 삭제(Delete) / 유지(Keep).',
  },
  estimatedEffort: {
    id: 'estimatedEffort',
    label: 'Estimated Effort',
    stage: 'elt',
    jiraField: 'customfield_35454',
    guide: '예상 기술 비용을 티셔츠 사이즈로 예측 (1 SP = 4h).',
    options: [
      { value: 'Small', desc: '1 sprint, ≤50 SP' },
      { value: 'Medium', desc: '2–3 sprint, 50–100 SP' },
      { value: 'Large', desc: '4–6 sprint, 100–200 SP' },
      { value: 'Extra Large', desc: '7–12 sprint, 200–600 SP' },
      { value: 'Extra Extra Large', desc: '13 sprint 이상, 600 SP 이상' },
    ],
  },
  controllabilityRisk: {
    id: 'controllabilityRisk',
    label: 'Controllability Risk',
    stage: 'elt',
    jiraField: 'customfield_35540',
    guide: '팀 내/외 조직 간 Dependency(의존도).',
    options: [
      { value: 'Minimal', desc: '팀/개발실 범위 내 진행 가능' },
      { value: 'Moderate', desc: 'HE 연구소 내 실간 의존' },
      { value: 'High', desc: '연구소 외 조직(SIC, webOS RP 등) 의존' },
      { value: 'Ultra_High', desc: 'LG전자 외부 업체(3rd party) 의존' },
    ],
  },
  components: {
    id: 'components',
    label: 'Component/s',
    stage: 'elt',
    jiraField: 'components',
    guide: '변경이 예상되는 git repository. Git이 없는 App/Server는 APP.XXX / SERVER.XXX. PoC·Product·SCM 과제 필수.',
  },
  branch: {
    id: 'branch',
    label: 'Branch',
    stage: 'elt',
    jiraField: 'customfield_36695',
    guide: 'PM 입력. Device 수정을 반영할 브랜치. 제품 적용 과제(Product) 필수.',
  },
  renewProgram: {
    id: 'renewProgram',
    label: 'webOS Re:New (Platform Upgrade restriction)',
    stage: 'elt',
    jiraField: 'customfield_37102',
    guide: '과거 출시 모델에 플랫폼 업그레이드 전개 시 제약 여부. O면 예외 모델 / HW / 기타 제약 / Data migration 작성.',
  },
  techScope: {
    id: 'techScope',
    label: '기술 요소 · Scope',
    stage: 'elt',
    jiraField: 'description',
    guide: '기술 주안점, 주변 요소 포함 시스템 컨텍스트. 불확실한 범위는 리스크와 완화 방안으로 정의.',
  },
  milestone: {
    id: 'milestone',
    label: 'Milestone',
    stage: 'elt',
    jiraField: 'customfield_37112',
    guide: '개발 마일스톤(TC 통과로 DoD 달성) / 비개발 마일스톤(산출물 기준). 동일 Sprint 다수 Delivery 지양.',
  },
  designImpact: {
    id: 'designImpact',
    label: '설계 변경 영향도',
    stage: 'elt',
    jiraField: 'description',
    guide: "'Scope of Change' 선택 사유. PoC·Product·SCM 과제 필수.",
  },
  riskRequest: {
    id: 'riskRequest',
    label: 'Risk 및 요청사항',
    stage: 'elt',
    jiraField: 'description',
    guide: "Owner가 해결할 수 없는 예상 Risk/요청 (없으면 '없음'). Product 필수.",
  },
  testPlan: {
    id: 'testPlan',
    label: 'Test Plan',
    stage: 'elt',
    jiraField: 'customfield_37113',
    guide: '이니셔티브 연관관계 · 항목과 범위 · 테스트 전략. Product 필수 (Large 이하는 약식 체크리스트).',
  },
}

export const REVIEW_STAGES: {
  id: ReviewStage | 'drafting' | 'dev'
  label: string
  owner: string
  desc: string
}[] = [
  { id: 'drafting', label: 'Drafting', owner: 'Reporter', desc: '템플릿 1단계 작성 · Owner 1차 선정' },
  { id: 'po', label: 'PO Review', owner: 'PO', desc: 'Biz. 가치 · 우선순위 · Owner 확정' },
  { id: 'elt', label: 'ELT Review', owner: 'ELT · Owner · PO', desc: '개발 범위 · Spec · 일정 확정' },
  { id: 'dev', label: 'In Progress', owner: 'Owner', desc: 'Milestone 진행 · Release Sprint 관리' },
]

export interface ReviewCheckItem {
  id: string
  area: 'biz' | 'scope' | 'spec' | 'schedule'
  text: string
  fields: InitiativeFieldId[]
}

export const REVIEW_AREA_LABEL: Record<ReviewCheckItem['area'], string> = {
  biz: 'Biz.',
  scope: '개발 범위',
  spec: 'Spec',
  schedule: '일정',
}

export const REVIEW_CHECKLIST: Record<ReviewStage, ReviewCheckItem[]> = {
  po: [
    { id: 'po-why', area: 'biz', text: '고객 가치와 비즈니스 케이스가 구체적인가 (업계 추세 · 고객 관점)', fields: ['whyWhat'] },
    { id: 'po-grp', area: 'biz', text: 'Grouping이 출시 영향도와 일치하는가 (Required = 미개발 시 출시 문제)', fields: ['grouping'] },
    { id: 'po-cat', area: 'biz', text: 'Categorization · Future Preparation 분류가 적절한가', fields: ['categorization', 'futurePreparation'] },
    { id: 'po-title', area: 'spec', text: 'Summary가 목적을 드러내고 prefix/suffix 규칙을 지키는가', fields: ['summary'] },
    { id: 'po-feature', area: 'spec', text: '피처 상세가 사용자 관점에서 기존 대비 이점을 설명하는가', fields: ['whyWhat'] },
    { id: 'po-ver', area: 'scope', text: 'Fix Version (Initial / MRs) 적용 대상 플랫폼이 맞는가', fields: ['fixVersion'] },
    { id: 'po-owner', area: 'scope', text: 'Initiative Owner가 적합한가 (PO 확정)', fields: ['assignee'] },
  ],
  elt: [
    { id: 'elt-scope', area: 'scope', text: 'Development Scope · SoC Dependency가 실제 변경점과 일치하는가', fields: ['developmentScope', 'socDependency'] },
    { id: 'elt-comp', area: 'scope', text: 'Component/s(git repository)와 Branch가 지정되었는가', fields: ['components', 'branch'] },
    { id: 'elt-arch', area: 'spec', text: 'Scope of Change와 설계 변경 영향도 — NA가 아니면 ARCH REVIEW 계획', fields: ['scopeOfChange', 'designImpact'] },
    { id: 'elt-srs', area: 'spec', text: 'SRS 작성 필요 여부 판단 (고객 관점 변경 시 필수 업데이트)', fields: ['srsRequired'] },
    { id: 'elt-test', area: 'spec', text: 'Test Plan · 비기능(CPU/메모리) 검증 마일스톤 포함', fields: ['testPlan', 'milestone'] },
    { id: 'elt-effort', area: 'schedule', text: 'Estimated Effort와 Milestone 예상 SP 합이 맞는가', fields: ['estimatedEffort', 'milestone'] },
    { id: 'elt-sprint', area: 'schedule', text: 'Release Sprint = Due Date, 완료 -1 Sprint 전 변경 규칙 인지', fields: ['releaseSprint', 'dueDate'] },
    { id: 'elt-risk', area: 'schedule', text: 'Controllability Risk와 Risk 및 요청사항이 정리되었는가', fields: ['controllabilityRisk', 'riskRequest'] },
  ],
}

export interface DirectoryUser {
  name: string
  displayName: string
  team: string
  /** 담당 Component prefix — Owner 자동 추천 근거 */
  components: string[]
}

/** BE 연동 전 Owner 자동 추천 mock (Jira user search · RPS 조직 대체) */
export const MOCK_DIRECTORY: DirectoryUser[] = [
  { name: 'seokmin.koh', displayName: '고석민', team: 'Audio SW PM', components: ['APP.SOUND', 'audio'] },
  { name: 'hongsoon.lee', displayName: '이홍순', team: 'Soundbar SW개발', components: ['soundbar', 'audio-hal'] },
  { name: 'inhoon.kim', displayName: '김인훈', team: 'webOS PO', components: [] },
  { name: 'gold.keum', displayName: '금정현', team: 'webOS PMO', components: ['SERVER.PMO'] },
  { name: 'yanghee.kim', displayName: '김양희', team: 'TV QE', components: ['qe'] },
  { name: 'kyungdug.hong', displayName: '홍경덕', team: 'webOS PMO', components: ['davis'] },
]

export const MOCK_CURRENT_USER = MOCK_DIRECTORY[0]
export const MOCK_DEFAULT_PO = MOCK_DIRECTORY[2]

export const DESCRIPTION_SECTIONS: { id: InitiativeFieldId; title: string; placeholder: string }[] = [
  { id: 'techScope', title: '기술 요소 · Scope', placeholder: '기술적 주안점, 주변 요소 포함 시스템 컨텍스트, 불확실한 범위의 리스크/완화 방안' },
  { id: 'designImpact', title: '설계 변경 영향도', placeholder: 'Scope of Change 선택 사유' },
  { id: 'riskRequest', title: 'Risk 및 요청사항', placeholder: "Owner가 해결할 수 없는 Risk 또는 요청사항 (없으면 '없음')" },
]
