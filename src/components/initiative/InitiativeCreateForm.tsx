import { useMemo } from 'react'
import { clsx } from 'clsx'
import { CalendarClock, Link2, Link2Off, Plus, Trash2, Wand2 } from 'lucide-react'
import {
  DESCRIPTION_SECTIONS,
  FIELD_GUIDES,
  INITIATIVE_OPTIONS,
  type DirectoryUser,
  type InitiativeFieldId,
} from '../../data/initiativeTemplate'
import type { FieldRequirement, FormIssue, InitiativeForm } from '../../utils/initiativeValidation'
import { EMPTY_MILESTONE } from '../../utils/initiativeValidation'
import { TEST_PLAN_SKELETON, type OwnerCandidate, milestoneSpTotal } from '../../utils/initiativeAutofill'
import { sprintByName, sprintChangeDeadline, sprintForDate, type Sprint } from '../../utils/initiativeSprint'
import { ChipSelect, ChoiceCards, FieldShell, SectionCard, inputClass } from './InitiativeFieldShell'
import InitiativeOwnerPicker from './InitiativeOwnerPicker'

interface Props {
  form: InitiativeForm
  onChange: (patch: Partial<InitiativeForm>) => void
  reqs: Record<InitiativeFieldId, FieldRequirement>
  issues: FormIssue[]
  showMissing: boolean
  sprints: Sprint[]
  directory: DirectoryUser[]
  ownerCandidates: OwnerCandidate[]
  syncDue: boolean
  onSyncDueChange: (v: boolean) => void
}

const FIX_VERSION_CHOICES = ['webOS TV 26 Initial', 'webOS TV 26 MRs', 'webOS TV 26', 'webOS TV 27 Initial', 'webOS TV 27 MRs', 'webOS TV 27']

function selectOptions(values: readonly string[]) {
  return values.map((v) => (
    <option key={v} value={v}>
      {v}
    </option>
  ))
}

function FieldIssues({ issues, field }: { issues: FormIssue[]; field: InitiativeFieldId }) {
  const list = issues.filter((i) => i.field === field)
  if (list.length === 0) return null
  return (
    <ul className="mt-1.5 space-y-0.5">
      {list.map((i) => (
        <li
          key={i.id}
          className={clsx(
            'text-[11px] font-medium',
            i.level === 'error' ? 'text-red-600' : i.level === 'warning' ? 'text-amber-700' : 'text-indigo-700'
          )}
        >
          {i.level === 'error' ? '✕' : i.level === 'warning' ? '!' : 'i'} {i.message}
        </li>
      ))}
    </ul>
  )
}

export default function InitiativeCreateForm({
  form,
  onChange,
  reqs,
  issues,
  showMissing,
  sprints,
  directory,
  ownerCandidates,
  syncDue,
  onSyncDueChange,
}: Props) {
  const shell = (id: InitiativeFieldId) => ({ id, req: reqs[id], showMissing })
  const sprint = sprintByName(sprints, form.releaseSprint)
  const dueSprint = sprintForDate(sprints, form.dueDate)
  const dueMismatch = Boolean(form.releaseSprint && form.dueDate && dueSprint?.name !== form.releaseSprint)
  const upcomingSprints = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return sprints.filter((s) => s.end >= today)
  }, [sprints])
  const spTotal = milestoneSpTotal(form)

  const toggleScope = (v: string) => {
    const has = form.developmentScope.includes(v)
    let next = has ? form.developmentScope.filter((x) => x !== v) : [...form.developmentScope, v]
    if (!has && v === 'NA') next = ['NA']
    else if (!has) next = next.filter((x) => x !== 'NA')
    if (!has && v === 'BSP' && !next.includes('Device')) next = ['Device', ...next]
    onChange({ developmentScope: next })
  }

  const onSprint = (name: string) => {
    const sp = sprintByName(sprints, name)
    onChange(syncDue && sp ? { releaseSprint: name, dueDate: sp.end } : { releaseSprint: name })
  }
  const onDue = (date: string) => {
    const sp = sprintForDate(sprints, date)
    onChange(syncDue && sp ? { dueDate: date, releaseSprint: sp.name } : { dueDate: date })
  }

  const updateMilestone = (idx: number, key: keyof (typeof form.milestones)[number], value: string) => {
    onChange({ milestones: form.milestones.map((m, i) => (i === idx ? { ...m, [key]: value } : m)) })
  }

  return (
    <div className="space-y-5">
      <SectionCard index={1} title="기본 정보" stage="PO Review" desc="과제 목적과 Owner — Reporter가 1차 작성">
        <FieldShell {...shell('summary')}>
          <input
            className={inputClass}
            value={form.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="[PRD 1234] 사운드바 Wi-Fi 연결 안정화 (Phase - 1/2)"
          />
          <FieldIssues issues={issues} field="summary" />
        </FieldShell>

        <div className="grid gap-5 md:grid-cols-2">
          <FieldShell {...shell('assignee')}>
            <InitiativeOwnerPicker
              value={form.assignee}
              onChange={(assignee) => onChange({ assignee })}
              directory={directory}
              candidates={ownerCandidates}
            />
          </FieldShell>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-800">PO</span>
              <span className="text-[11px] text-gray-400">customfield_35456</span>
            </div>
            <InitiativeOwnerPicker value={form.po} onChange={(po) => onChange({ po })} directory={directory} placeholder="PO 검색" />
          </div>
        </div>

        <FieldShell {...shell('fixVersion')}>
          <ChipSelect
            values={form.fixVersions}
            options={FIX_VERSION_CHOICES}
            onToggle={(v) =>
              onChange({
                fixVersions: form.fixVersions.includes(v) ? form.fixVersions.filter((x) => x !== v) : [...form.fixVersions, v],
              })
            }
          />
          <FieldIssues issues={issues} field="fixVersion" />
        </FieldShell>
      </SectionCard>

      <SectionCard index={2} title="Biz. 분류" stage="PO Review" desc="고객 가치 · 우선순위 · 과제 성격">
        <FieldShell {...shell('grouping')}>
          <ChoiceCards value={form.grouping} options={FIELD_GUIDES.grouping.options!} onChange={(grouping) => onChange({ grouping })} />
        </FieldShell>
        <FieldShell {...shell('categorization')}>
          <ChoiceCards
            value={form.categorization}
            options={FIELD_GUIDES.categorization.options!}
            onChange={(categorization) => onChange({ categorization })}
            columns={6}
          />
        </FieldShell>
        <FieldShell {...shell('futurePreparation')}>
          <ChoiceCards
            value={form.futurePreparation}
            options={FIELD_GUIDES.futurePreparation.options!}
            onChange={(futurePreparation) => onChange({ futurePreparation })}
            columns={4}
          />
        </FieldShell>
        <FieldShell {...shell('whyWhat')}>
          <textarea
            className={clsx(inputClass, 'min-h-[140px] font-[inherit] leading-relaxed')}
            value={form.whyWhat}
            onChange={(e) => onChange({ whyWhat: e.target.value })}
            placeholder={'[고객 가치와 비즈니스 케이스]\n발의 목적, 업계 추세, 고객 관점 가치\n\n[피처 상세]\n사용자 관점의 동작, 기존 대비 이점'}
          />
        </FieldShell>
      </SectionCard>

      <SectionCard index={3} title="일정" stage="ELT Review" desc="Release Sprint ↔ Due Date 자동 동기화">
        <div className="flex items-center justify-between rounded-lg bg-surface-page px-3 py-2">
          <p className="text-xs text-gray-600">
            Release Sprint를 고르면 Due Date가 Sprint 종료일로, Due Date를 고르면 해당 Sprint로 맞춰집니다.
          </p>
          <button
            type="button"
            onClick={() => onSyncDueChange(!syncDue)}
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition',
              syncDue ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-surface-border'
            )}
          >
            {syncDue ? <Link2 size={13} /> : <Link2Off size={13} />}
            {syncDue ? '동기화 ON' : '동기화 OFF'}
          </button>
        </div>
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr_1fr]">
          <FieldShell {...shell('releaseSprint')}>
            <select className={inputClass} value={form.releaseSprint} onChange={(e) => onSprint(e.target.value)}>
              <option value="">Sprint 선택</option>
              {upcomingSprints.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell {...shell('dueDate')}>
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => onDue(e.target.value)} />
          </FieldShell>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-gray-800">Start Date</div>
            <input type="date" className={inputClass} value={form.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
          </div>
        </div>
        {sprint ? (
          <div
            className={clsx(
              'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs',
              dueMismatch ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            )}
          >
            <CalendarClock size={14} />
            <span>
              Sprint 기간 <b>{sprint.start}</b> ~ <b>{sprint.end}</b>
            </span>
            <span>
              일정 변경 마감 <b>{sprintChangeDeadline(sprints, sprint)}</b> (완료 -1 Sprint 시작 전)
            </span>
            {dueMismatch ? <span className="font-semibold">Due Date가 Release Sprint 밖입니다 — {dueSprint?.name ?? 'Sprint 없음'}</span> : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard index={4} title="개발 범위 · Spec" stage="ELT Review" desc="변경점 · 영향도 · 비용 · 의존도">
        <FieldShell {...shell('developmentScope')}>
          <ChipSelect values={form.developmentScope} options={FIELD_GUIDES.developmentScope.options!} onToggle={toggleScope} />
          <FieldIssues issues={issues} field="developmentScope" />
        </FieldShell>

        <div className="grid gap-5 md:grid-cols-3">
          <FieldShell {...shell('socDependency')}>
            <select className={inputClass} value={form.socDependency} onChange={(e) => onChange({ socDependency: e.target.value })}>
              <option value="">선택</option>
              {selectOptions(INITIATIVE_OPTIONS.socDependency)}
            </select>
            <FieldIssues issues={issues} field="socDependency" />
          </FieldShell>
          <FieldShell {...shell('srsRequired')}>
            <select className={inputClass} value={form.srsRequired} onChange={(e) => onChange({ srsRequired: e.target.value })}>
              <option value="">선택</option>
              {selectOptions(INITIATIVE_OPTIONS.srsRequired)}
            </select>
          </FieldShell>
          <FieldShell {...shell('branch')}>
            <select className={inputClass} value={form.branch} onChange={(e) => onChange({ branch: e.target.value })}>
              <option value="">선택</option>
              {selectOptions(INITIATIVE_OPTIONS.branch)}
            </select>
            <FieldIssues issues={issues} field="branch" />
          </FieldShell>
        </div>

        <FieldShell {...shell('scopeOfChange')}>
          <ChoiceCards
            value={form.scopeOfChange}
            options={FIELD_GUIDES.scopeOfChange.options!}
            onChange={(scopeOfChange) => onChange({ scopeOfChange })}
            columns={4}
          />
          <FieldIssues issues={issues} field="scopeOfChange" />
        </FieldShell>

        <FieldShell
          {...shell('estimatedEffort')}
          aside={spTotal ? <span className="text-[11px] text-gray-500">Milestone SP 합 {spTotal}</span> : null}
        >
          <ChoiceCards
            value={form.estimatedEffort}
            options={FIELD_GUIDES.estimatedEffort.options!}
            onChange={(estimatedEffort) => onChange({ estimatedEffort })}
            columns={5}
          />
        </FieldShell>

        <FieldShell {...shell('controllabilityRisk')}>
          <ChoiceCards
            value={form.controllabilityRisk}
            options={FIELD_GUIDES.controllabilityRisk.options!}
            onChange={(controllabilityRisk) => onChange({ controllabilityRisk })}
            columns={4}
          />
        </FieldShell>

        <div className="grid gap-5 md:grid-cols-2">
          <FieldShell {...shell('components')}>
            <input
              className={inputClass}
              value={form.components}
              onChange={(e) => onChange({ components: e.target.value })}
              placeholder="audio-hal, APP.SOUND (쉼표 구분)"
            />
          </FieldShell>
          <FieldShell {...shell('renewProgram')}>
            <div className="flex gap-2">
              {INITIATIVE_OPTIONS.renewProgram.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ renewProgram: form.renewProgram === v ? '' : v })}
                  className={clsx(
                    'flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition',
                    form.renewProgram === v
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-surface-border bg-white text-gray-600 hover:border-indigo-300'
                  )}
                >
                  {v === 'O' ? 'O · 제약 있음' : 'X · 그대로 전개'}
                </button>
              ))}
            </div>
            {form.renewProgram === 'O' ? (
              <textarea
                className={clsx(inputClass, 'mt-2 min-h-[72px]')}
                value={form.renewDetail}
                onChange={(e) => onChange({ renewDetail: e.target.value })}
                placeholder="예외 모델 / HW restrictions / etc restrictions / Data migration"
              />
            ) : null}
            <FieldIssues issues={issues} field="renewProgram" />
          </FieldShell>
        </div>
      </SectionCard>

      <SectionCard index={5} title="Description · Milestone · Test Plan" stage="ELT Review" desc="ELT Review에서 확인하는 상세 내용">
        {DESCRIPTION_SECTIONS.map((sec) => (
          <FieldShell key={sec.id} {...shell(sec.id)}>
            <textarea
              className={clsx(inputClass, 'min-h-[84px] leading-relaxed')}
              value={form[sec.id as 'techScope' | 'designImpact' | 'riskRequest']}
              onChange={(e) => onChange({ [sec.id]: e.target.value } as Partial<InitiativeForm>)}
              placeholder={sec.placeholder}
            />
          </FieldShell>
        ))}

        <FieldShell {...shell('milestone')}>
          <div className="overflow-hidden rounded-lg border border-surface-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-page text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">마일스톤</th>
                  <th className="px-2 py-2 text-left font-semibold">산출물</th>
                  <th className="px-2 py-2 text-left font-semibold">DoD</th>
                  <th className="w-44 px-2 py-2 text-left font-semibold">Target Sprint</th>
                  <th className="w-16 px-2 py-2 text-left font-semibold">SP</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.milestones.map((m, idx) => (
                  <tr key={idx} className="border-t border-surface-border">
                    {(['name', 'output', 'dod'] as const).map((k) => (
                      <td key={k} className="p-1">
                        <input
                          className="w-full rounded border border-transparent px-2 py-1.5 text-xs hover:border-surface-border focus:border-indigo-400 focus:outline-none"
                          value={m[k]}
                          onChange={(e) => updateMilestone(idx, k, e.target.value)}
                          placeholder={k === 'name' ? `마일스톤 ${idx + 1}` : k === 'output' ? '산출물' : 'TC 통과 / 산출물 기준'}
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <select
                        className="w-full rounded border border-transparent px-1 py-1.5 text-xs hover:border-surface-border focus:border-indigo-400 focus:outline-none"
                        value={m.sprint}
                        onChange={(e) => updateMilestone(idx, 'sprint', e.target.value)}
                      >
                        <option value="">-</option>
                        {upcomingSprints.slice(0, 30).map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded border border-transparent px-2 py-1.5 text-xs hover:border-surface-border focus:border-indigo-400 focus:outline-none"
                        value={m.sp}
                        onChange={(e) => updateMilestone(idx, 'sp', e.target.value)}
                      />
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        disabled={form.milestones.length === 1}
                        onClick={() => onChange({ milestones: form.milestones.filter((_, i) => i !== idx) })}
                        className="rounded p-1 text-gray-300 hover:text-red-500 disabled:opacity-30"
                        aria-label="마일스톤 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => onChange({ milestones: [...form.milestones, { ...EMPTY_MILESTONE }] })}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <Plus size={13} /> 마일스톤 추가
          </button>
        </FieldShell>

        <FieldShell
          {...shell('testPlan')}
          aside={
            !form.testPlan.trim() ? (
              <button
                type="button"
                onClick={() => onChange({ testPlan: TEST_PLAN_SKELETON })}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50"
              >
                <Wand2 size={12} /> 양식 삽입
              </button>
            ) : null
          }
        >
          <textarea
            className={clsx(inputClass, 'min-h-[120px] font-mono text-xs leading-relaxed')}
            value={form.testPlan}
            onChange={(e) => onChange({ testPlan: e.target.value })}
            placeholder="이니셔티브 연관관계 · 항목과 범위 · 테스트 전략"
          />
        </FieldShell>
      </SectionCard>
    </div>
  )
}
