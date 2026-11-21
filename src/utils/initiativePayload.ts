import type { InitiativeForm } from './initiativeValidation'

const opt = (v: string) => (v ? { value: v } : undefined)
const optList = (vs: string[]) => (vs.length ? vs.map((value) => ({ value })) : undefined)

function milestoneTable(form: InitiativeForm): string {
  const rows = form.milestones.filter((m) => m.name.trim() || m.dod.trim())
  if (rows.length === 0) return ''
  const head = '||마일스톤||산출물||DoD||Target Sprint||예상SP||'
  return [head, ...rows.map((m) => `|${m.name || ' '}|${m.output || ' '}|${m.dod || ' '}|${m.sprint || ' '}|${m.sp || ' '}|`)].join('\n')
}

function description(form: InitiativeForm): string {
  const parts: [string, string][] = [
    ['기술 요소 · Scope', form.techScope],
    ['설계 변경 영향도', form.designImpact],
    ['Risk 및 요청사항', form.riskRequest],
  ]
  return parts
    .filter(([, body]) => body.trim())
    .map(([title, body]) => `h4. ${title}\n${body.trim()}`)
    .join('\n\n')
}

/** Jira REST create payload (TVPLAT Initiative). Scope of Change 는 field id 확인 전이라 이름으로 둠. */
export function buildInitiativePayload(form: InitiativeForm): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    project: { key: 'TVPLAT' },
    issuetype: { name: 'Initiative' },
    summary: form.summary.trim(),
    labels: ['Created_By_Davis'],
    components: form.components.trim()
      ? form.components.split(',').map((c) => ({ name: c.trim() })).filter((c) => c.name)
      : [{ name: 'NA' }],
    assignee: form.assignee ? { name: form.assignee.name } : undefined,
    customfield_35456: form.po ? [{ name: form.po.name }] : undefined,
    fixVersions: form.fixVersions.length ? form.fixVersions.map((name) => ({ name })) : undefined,
    duedate: form.dueDate || undefined,
    customfield_35441: form.startDate || undefined,
    customfield_35455: opt(form.grouping),
    customfield_35516: opt(form.categorization),
    customfield_37099: opt(form.futurePreparation),
    customfield_35517: form.releaseSprint ? [form.releaseSprint] : undefined,
    customfield_36694: optList(form.developmentScope),
    customfield_36038: form.socDependency ? [{ value: form.socDependency === 'NA' ? 'N/A' : form.socDependency }] : undefined,
    scopeOfChange: opt(form.scopeOfChange),
    customfield_35541: opt(form.srsRequired),
    customfield_35454: opt(form.estimatedEffort),
    customfield_35540: opt(form.controllabilityRisk),
    customfield_36695: form.branch ? [{ value: form.branch }] : undefined,
    customfield_37102: opt(form.renewProgram),
    customfield_37111: form.whyWhat.trim() || undefined,
    customfield_37112: milestoneTable(form) || undefined,
    customfield_37113: form.testPlan.trim() || undefined,
    description: description(form) || undefined,
  }
  return { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) }
}
