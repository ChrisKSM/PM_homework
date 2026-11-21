import { FIELD_GUIDES, type InitiativeFieldId, type ReviewStage } from '../data/initiativeTemplate'

export interface InitiativeOwner {
  name: string
  displayName: string
  team?: string
}

export interface InitiativeMilestoneRow {
  name: string
  output: string
  dod: string
  sprint: string
  sp: string
}

export interface InitiativeForm {
  summary: string
  assignee: InitiativeOwner | null
  po: InitiativeOwner | null
  fixVersions: string[]
  grouping: string
  categorization: string
  futurePreparation: string
  whyWhat: string
  releaseSprint: string
  dueDate: string
  startDate: string
  developmentScope: string[]
  socDependency: string
  scopeOfChange: string
  srsRequired: string
  estimatedEffort: string
  controllabilityRisk: string
  components: string
  branch: string
  renewProgram: string
  renewDetail: string
  techScope: string
  milestones: InitiativeMilestoneRow[]
  designImpact: string
  riskRequest: string
  testPlan: string
}

export const EMPTY_MILESTONE: InitiativeMilestoneRow = { name: '', output: '', dod: '', sprint: '', sp: '' }

export function emptyInitiativeForm(): InitiativeForm {
  return {
    summary: '',
    assignee: null,
    po: null,
    fixVersions: [],
    grouping: '',
    categorization: '',
    futurePreparation: '',
    whyWhat: '',
    releaseSprint: '',
    dueDate: '',
    startDate: '',
    developmentScope: [],
    socDependency: '',
    scopeOfChange: '',
    srsRequired: '',
    estimatedEffort: '',
    controllabilityRisk: '',
    components: '',
    branch: '',
    renewProgram: '',
    renewDetail: '',
    techScope: '',
    milestones: [{ ...EMPTY_MILESTONE }],
    designImpact: '',
    riskRequest: '',
    testPlan: '',
  }
}

export interface FieldRequirement {
  id: InitiativeFieldId
  stage: ReviewStage
  required: boolean
  /** 조건부 필수 사유 (예: Categorization = Product) */
  reason?: string
  filled: boolean
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface FormIssue {
  id: string
  level: IssueLevel
  field: InitiativeFieldId
  message: string
}

function hasText(s: string): boolean {
  return s.trim().length > 0
}

function filledValue(form: InitiativeForm, id: InitiativeFieldId): boolean {
  switch (id) {
    case 'assignee':
      return Boolean(form.assignee)
    case 'fixVersion':
      return form.fixVersions.length > 0
    case 'developmentScope':
      return form.developmentScope.length > 0
    case 'milestone':
      return form.milestones.some((m) => hasText(m.name) && hasText(m.dod))
    case 'summary':
    case 'grouping':
    case 'categorization':
    case 'futurePreparation':
    case 'whyWhat':
    case 'releaseSprint':
    case 'dueDate':
    case 'socDependency':
    case 'scopeOfChange':
    case 'srsRequired':
    case 'estimatedEffort':
    case 'controllabilityRisk':
    case 'components':
    case 'branch':
    case 'renewProgram':
    case 'techScope':
    case 'designImpact':
    case 'riskRequest':
    case 'testPlan':
      return hasText(form[id])
  }
}

const ALWAYS_REQUIRED: InitiativeFieldId[] = [
  'summary',
  'assignee',
  'fixVersion',
  'grouping',
  'categorization',
  'whyWhat',
  'releaseSprint',
  'dueDate',
  'developmentScope',
  'estimatedEffort',
  'controllabilityRisk',
  'milestone',
]

const PRODUCT_REQUIRED: InitiativeFieldId[] = ['srsRequired', 'branch', 'riskRequest', 'testPlan']
const POC_PRODUCT_REQUIRED: InitiativeFieldId[] = ['components', 'designImpact']

export function fieldRequirements(form: InitiativeForm): FieldRequirement[] {
  const isProduct = form.categorization === 'Product'
  const isPocOrProduct = isProduct || form.categorization === 'PoC'
  const bsp = form.developmentScope.includes('BSP')

  return (Object.keys(FIELD_GUIDES) as InitiativeFieldId[]).map((id) => {
    let required = ALWAYS_REQUIRED.includes(id)
    let reason: string | undefined
    if (!required && isProduct && PRODUCT_REQUIRED.includes(id)) {
      required = true
      reason = 'Categorization = Product'
    }
    if (!required && isPocOrProduct && POC_PRODUCT_REQUIRED.includes(id)) {
      required = true
      reason = `Categorization = ${form.categorization}`
    }
    if (!required && id === 'socDependency' && bsp) {
      required = true
      reason = 'Development Scope에 BSP 포함'
    }
    if (!required && id === 'scopeOfChange' && isPocOrProduct) {
      required = true
      reason = `Categorization = ${form.categorization}`
    }
    return { id, stage: FIELD_GUIDES[id].stage, required, reason, filled: filledValue(form, id) }
  })
}

const ALLOWED_PREFIX = /^\[(RMS|PRD) \d+\]\s*/
const TAG_PREFIX = /^\[[A-Z0-9_]{2,12}\]\s*/
const ALLOWED_SUFFIX = /\s*\((Phase - \d+\/\d+|대표|약식)\)$/

export function lintSummary(summary: string): string[] {
  const s = summary.trim()
  if (!s) return []
  const msgs: string[] = []
  let rest = s
  const prefix = rest.match(ALLOWED_PREFIX) || rest.match(TAG_PREFIX)
  if (prefix) rest = rest.slice(prefix[0].length)
  if (/^\[(RMS|PRD)\d+\]/i.test(s) || /^\[(rms|prd) \d+\]/.test(s)) {
    msgs.push('요구사항 prefix는 "[RMS 1234]" / "[PRD 1234]" 형식 (대문자 + 공백 + 번호)')
  }
  if (/[[\]]/.test(rest)) msgs.push('대괄호 [ ]는 prefix 외에는 사용할 수 없습니다')
  const suffixLike = rest.match(/\(([^)]*)\)\s*$/)
  if (suffixLike && !ALLOWED_SUFFIX.test(rest) && /phase|대표|약식/i.test(suffixLike[1])) {
    msgs.push('suffix는 (Phase - 1/N), (대표), (약식) 형식')
  }
  if (rest.length < 8) msgs.push('과제 내용/목적이 드러나도록 구체적으로 작성')
  return msgs
}

export function formIssues(form: InitiativeForm): FormIssue[] {
  const issues: FormIssue[] = []
  for (const msg of lintSummary(form.summary)) {
    issues.push({ id: `summary-${msg}`, level: 'error', field: 'summary', message: msg })
  }
  const scope = form.developmentScope
  if (scope.includes('BSP') && !scope.includes('Device')) {
    issues.push({ id: 'bsp-device', level: 'error', field: 'developmentScope', message: 'BSP 선택 시 EPK가 변경되므로 Device도 함께 선택' })
  }
  if (scope.includes('NA') && scope.length > 1) {
    issues.push({ id: 'scope-na', level: 'error', field: 'developmentScope', message: 'NA는 다른 범위와 함께 선택할 수 없습니다' })
  }
  if (scope.includes('BSP') && form.socDependency === 'NA') {
    issues.push({ id: 'soc-na', level: 'error', field: 'socDependency', message: 'BSP 변경이 있으면 SoC 업체를 선택' })
  }
  if (form.categorization && form.categorization !== 'Product' && scope.length > 0 && !scope.includes('NA') && form.categorization !== 'PoC') {
    issues.push({ id: 'scope-nonproduct', level: 'warning', field: 'developmentScope', message: `${form.categorization} 과제는 보통 Development Scope = NA` })
  }
  if (form.scopeOfChange && form.scopeOfChange !== 'NA') {
    issues.push({ id: 'arch', level: 'info', field: 'scopeOfChange', message: 'Scope of Change ≠ NA → ARCH REVIEW 프로세스 진행 필요' })
  }
  if (form.branch && form.branch !== 'NA' && !scope.includes('Device')) {
    issues.push({ id: 'branch-device', level: 'warning', field: 'branch', message: 'Device 수정이 없으면 Branch = NA' })
  }
  if (form.renewProgram === 'O' && !hasText(form.renewDetail)) {
    issues.push({ id: 'renew', level: 'warning', field: 'renewProgram', message: 'Platform Upgrade 제약(O) — 예외 모델 / HW·기타 제약 / Data migration 작성' })
  }
  const fixInitial = form.fixVersions.some((v) => v.endsWith('Initial'))
  const fixMr = form.fixVersions.some((v) => v.endsWith('MRs'))
  if (fixInitial && fixMr) {
    issues.push({ id: 'fix-both', level: 'info', field: 'fixVersion', message: 'Initial과 MRs를 동시에 선택 — ELT Review에서 최종 확정' })
  }
  return issues
}

export function stageProgress(reqs: FieldRequirement[], stage: ReviewStage): { done: number; total: number } {
  const target = reqs.filter((r) => r.required && (stage === 'elt' || r.stage === 'po'))
  return { done: target.filter((r) => r.filled).length, total: target.length }
}
