import type { DirectoryUser, InitiativeFieldId } from '../data/initiativeTemplate'
import { FIELD_GUIDES } from '../data/initiativeTemplate'
import type { InitiativeForm, InitiativeOwner } from './initiativeValidation'
import { sprintByName, sprintForDate, todayIso, type Sprint } from './initiativeSprint'

export interface AutofillChange {
  field: InitiativeFieldId | 'startDate' | 'po'
  label: string
  value: string
  reason: string
}

export interface OwnerCandidate {
  user: DirectoryUser
  score: number
  reason: string
}

export const TEST_PLAN_SKELETON = `[이니셔티브 연관관계 파악]
-

[항목과 범위]
1) 테스트 항목:
2) 포함 범위:
3) 제외 항목과 사유:

[테스트 전략]
■ 항목 #1 — 검증 목표 / 검증 전략 / 검증 일정
■ 최초 현물 데모 목표 — 아이템, 선정 이유, 목표 일정`

function toOwner(u: DirectoryUser): InitiativeOwner {
  return { name: u.name, displayName: u.displayName, team: u.team }
}

export function recommendOwners(
  form: InitiativeForm,
  directory: DirectoryUser[],
  reporter: DirectoryUser
): OwnerCandidate[] {
  const comps = form.components
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
  const out: OwnerCandidate[] = []
  for (const user of directory) {
    const hits = user.components.filter((p) => comps.some((c) => c.startsWith(p.toLowerCase())))
    if (hits.length) {
      const exact = hits.filter((p) => comps.includes(p.toLowerCase())).length
      out.push({ user, score: 80 + hits.length * 5 + exact * 10, reason: `Component ${hits.join(', ')} 담당` })
    }
  }
  if (!out.some((c) => c.user.name === reporter.name)) {
    out.push({ user: reporter, score: 50, reason: 'Reporter 우선 선정 (PO/ELT Review에서 확정)' })
  }
  return out.sort((a, b) => b.score - a.score)
}

function effortFromSp(sp: number): string | null {
  if (!sp) return null
  if (sp <= 50) return 'Small'
  if (sp <= 100) return 'Medium'
  if (sp <= 200) return 'Large'
  if (sp <= 600) return 'Extra Large'
  return 'Extra Extra Large'
}

export function milestoneSpTotal(form: InitiativeForm): number {
  return form.milestones.reduce((sum, m) => sum + (Number(m.sp) || 0), 0)
}

export function computeAutofill(
  form: InitiativeForm,
  ctx: { sprints: Sprint[]; directory: DirectoryUser[]; reporter: DirectoryUser; defaultPo: DirectoryUser }
): { next: InitiativeForm; changes: AutofillChange[] } {
  const next: InitiativeForm = { ...form, milestones: form.milestones.map((m) => ({ ...m })) }
  const changes: AutofillChange[] = []
  const set = <K extends keyof InitiativeForm>(
    key: K,
    value: InitiativeForm[K],
    field: AutofillChange['field'],
    shown: string,
    reason: string
  ) => {
    next[key] = value
    const label = field === 'startDate' ? 'Start Date' : field === 'po' ? 'PO' : FIELD_GUIDES[field].label
    changes.push({ field, label, value: shown, reason })
  }

  const nonProduct = Boolean(next.categorization) && !['Product', 'PoC'].includes(next.categorization)

  if (!next.assignee) {
    const top = recommendOwners(next, ctx.directory, ctx.reporter)[0]
    if (top) set('assignee', toOwner(top.user), 'assignee', `${top.user.displayName} (${top.user.name})`, top.reason)
  }
  if (!next.po) {
    set('po', toOwner(ctx.defaultPo), 'po', `${ctx.defaultPo.displayName} (${ctx.defaultPo.name})`, '조직 기본 PO')
  }
  if (!next.startDate) set('startDate', todayIso(), 'startDate', todayIso(), '생성일')

  if (next.releaseSprint && !next.dueDate) {
    const sp = sprintByName(ctx.sprints, next.releaseSprint)
    if (sp) set('dueDate', sp.end, 'dueDate', sp.end, 'Release Sprint 종료일')
  } else if (next.dueDate && !next.releaseSprint) {
    const sp = sprintForDate(ctx.sprints, next.dueDate)
    if (sp) set('releaseSprint', sp.name, 'releaseSprint', sp.name, 'Due Date가 포함된 Sprint')
  }

  if (next.fixVersions.length === 0) {
    const year = (next.dueDate || todayIso()).slice(2, 4)
    const v = next.categorization === 'Product' ? `webOS TV ${year} Initial` : `webOS TV ${year}`
    set('fixVersions', [v], 'fixVersion', v, next.categorization === 'Product' ? 'Due Date 연도 · 제품 적용' : 'Due Date 연도 · 제품화 외 과제')
  }
  if (!next.futurePreparation) set('futurePreparation', 'NA', 'futurePreparation', 'NA', '기본값')

  if (nonProduct) {
    if (next.developmentScope.length === 0) set('developmentScope', ['NA'], 'developmentScope', 'NA', `${next.categorization} 과제 — SW 변경 없음`)
    if (!next.scopeOfChange) set('scopeOfChange', 'NA', 'scopeOfChange', 'NA', '제품 미적용 과제')
    if (!next.srsRequired) set('srsRequired', '유지', 'srsRequired', '유지', '제품 미적용 과제')
    if (!next.components.trim()) set('components', 'NA', 'components', 'NA', '제품 미적용 과제')
  }
  if (!next.socDependency && !next.developmentScope.includes('BSP') && next.developmentScope.length > 0) {
    set('socDependency', 'NA', 'socDependency', 'NA', 'BSP 변경 없음')
  }
  if (!next.branch && next.developmentScope.length > 0 && !next.developmentScope.includes('Device')) {
    set('branch', 'NA', 'branch', 'NA', 'Device 수정 없음')
  }
  if (!next.renewProgram) set('renewProgram', 'X', 'renewProgram', 'X', '제약 없음 기본값')

  const effort = effortFromSp(milestoneSpTotal(next))
  if (!next.estimatedEffort && effort) {
    set('estimatedEffort', effort, 'estimatedEffort', effort, `Milestone 예상 SP 합 ${milestoneSpTotal(next)}`)
  }
  return { next, changes }
}
