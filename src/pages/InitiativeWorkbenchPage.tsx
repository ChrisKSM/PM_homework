import { useCallback, useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, ClipboardCheck, Copy, FilePlus2 } from 'lucide-react'
import Header from '../components/layout/Header'
import InitiativeAssistantPanel from '../components/initiative/InitiativeAssistantPanel'
import InitiativeClonePanel from '../components/initiative/InitiativeClonePanel'
import InitiativeCreateDialog from '../components/initiative/InitiativeCreateDialog'
import InitiativeCreateForm from '../components/initiative/InitiativeCreateForm'
import InitiativeReviewGuide from '../components/initiative/InitiativeReviewGuide'
import { INITIATIVE_TEMPLATE_KEY, REVIEW_STAGES, type InitiativeFieldId } from '../data/initiativeTemplate'
import {
  MOCK_CURRENT_USER,
  MOCK_DEFAULT_PO,
  MOCK_DIRECTORY,
  MOCK_ORG_TEAMS,
  MOCK_TEAM_ORGANIZATIONS,
} from '../data/initiativeOrg'
import { computeAutofill, recommendOwners } from '../utils/initiativeAutofill'
import { sprintCalendar } from '../utils/initiativeSprint'
import {
  emptyInitiativeForm,
  fieldRequirements,
  formIssues,
  stageProgress,
  type FieldRequirement,
  type InitiativeForm,
} from '../utils/initiativeValidation'

type Tab = 'create' | 'clone' | 'review'

const DRAFT_KEY = 'initiative-workbench-draft-v1'
const CHECKS_KEY = 'initiative-workbench-review-checks-v1'

const ORG_SOURCE = { teams: MOCK_ORG_TEAMS, partsByTeam: MOCK_TEAM_ORGANIZATIONS, defaultTeam: MOCK_CURRENT_USER.team }

const TABS: { id: Tab; label: string; icon: typeof FilePlus2; desc: string }[] = [
  { id: 'create', label: '신규 생성', icon: FilePlus2, desc: '템플릿 기반 작성 · 자동 입력' },
  { id: 'clone', label: '복제 생성', icon: Copy, desc: '기존 Initiative 계층 복제' },
  { id: 'review', label: 'PO · ELT 리뷰 가이드', icon: ClipboardCheck, desc: 'Biz. · 개발 범위 · Spec 점검' },
]

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

export default function InitiativeWorkbenchPage() {
  const [tab, setTab] = useState<Tab>('create')
  const [form, setForm] = useState<InitiativeForm>(() => loadJson(DRAFT_KEY, emptyInitiativeForm()))
  const [checks, setChecks] = useState<Record<string, boolean>>(() => loadJson(CHECKS_KEY, {}))
  const [syncDue, setSyncDue] = useState(true)
  const [showMissing, setShowMissing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const sprints = useMemo(() => {
    const y = new Date().getFullYear()
    return sprintCalendar([y, y + 1, y + 2])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 500)
    return () => clearTimeout(t)
  }, [form])

  useEffect(() => {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(checks))
  }, [checks])

  const reqList = useMemo(() => fieldRequirements(form), [form])
  const reqs = useMemo(
    () => Object.fromEntries(reqList.map((r) => [r.id, r])) as Record<InitiativeFieldId, FieldRequirement>,
    [reqList]
  )
  const issues = useMemo(() => formIssues(form), [form])
  const po = stageProgress(reqList, 'po')
  const elt = stageProgress(reqList, 'elt')
  const ownerCandidates = useMemo(() => recommendOwners(form, MOCK_DIRECTORY, MOCK_CURRENT_USER), [form])
  const autofill = useMemo(
    () => computeAutofill(form, { sprints, directory: MOCK_DIRECTORY, reporter: MOCK_CURRENT_USER, defaultPo: MOCK_DEFAULT_PO }),
    [form, sprints]
  )
  const missingCount = reqList.filter((r) => r.required && !r.filled).length
  const errorCount = issues.filter((i) => i.level === 'error').length

  const patch = useCallback((p: Partial<InitiativeForm>) => setForm((prev) => ({ ...prev, ...p })), [])

  const jump = useCallback((field: InitiativeFieldId) => {
    setTab('create')
    setShowMissing(true)
    requestAnimationFrame(() => {
      const el = document.getElementById(`field-${field}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true })
    })
  }, [])

  const stageState = (id: string): 'done' | 'current' | 'next' => {
    if (id === 'drafting') return po.done === po.total ? 'done' : 'current'
    if (id === 'po') return po.done === po.total ? (elt.done === elt.total ? 'done' : 'current') : 'next'
    if (id === 'elt') return elt.done === elt.total ? 'current' : 'next'
    return 'next'
  }

  return (
    <>
      <Header
        title="Initiative 워크벤치"
        subtitle={`${INITIATIVE_TEMPLATE_KEY} Initiative Template 기반 생성 · 리뷰 가이드`}
        showRefresh={false}
      />
      <div className="pt-16 p-6 space-y-6 max-w-[1400px]">
        <ol className="mt-6 grid gap-2 rounded-xl border border-surface-border bg-white p-2 shadow-sm sm:grid-cols-4">
          {REVIEW_STAGES.map((s, idx) => {
            const state = stageState(s.id)
            return (
              <li
                key={s.id}
                className={clsx(
                  'relative flex items-start gap-3 rounded-lg px-3 py-2.5',
                  state === 'current' && 'bg-gray-900 text-white',
                  state === 'done' && 'bg-emerald-50'
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    state === 'current' && 'bg-white text-gray-900',
                    state === 'done' && 'bg-emerald-500 text-white',
                    state === 'next' && 'bg-gray-100 text-gray-500'
                  )}
                >
                  {state === 'done' ? <CheckCircle2 size={14} /> : idx + 1}
                </span>
                <div className="min-w-0">
                  <p className={clsx('text-[13px] font-bold', state === 'next' ? 'text-gray-700' : '')}>{s.label}</p>
                  <p className={clsx('text-[11px]', state === 'current' ? 'text-gray-300' : 'text-gray-500')}>
                    {s.owner} · {s.desc}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition',
                  active ? 'border-gray-900 bg-gray-900 text-white shadow-sm' : 'border-surface-border bg-white text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon size={16} className={active ? 'text-white' : 'text-gray-500'} />
                <span>
                  <span className="block text-[13px] font-semibold">{t.label}</span>
                  <span className={clsx('block text-[11px]', active ? 'text-gray-300' : 'text-gray-400')}>{t.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        {tab === 'create' ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <InitiativeCreateForm
              form={form}
              onChange={patch}
              reqs={reqs}
              issues={issues}
              showMissing={showMissing}
              sprints={sprints}
              directory={MOCK_DIRECTORY}
              ownerCandidates={ownerCandidates}
              org={ORG_SOURCE}
              syncDue={syncDue}
              onSyncDueChange={setSyncDue}
            />
            <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-2">
              <InitiativeAssistantPanel
                reqs={reqList}
                issues={issues}
                po={po}
                elt={elt}
                autofillPreview={autofill.changes}
                onApplyAutofill={() => setForm(autofill.next)}
                onJump={jump}
                onCreate={() => {
                  setShowMissing(true)
                  setDialogOpen(true)
                }}
                onReset={() => {
                  setForm(emptyInitiativeForm())
                  setShowMissing(false)
                }}
                savedAt={savedAt}
              />
            </aside>
          </div>
        ) : null}

        {tab === 'clone' ? <InitiativeClonePanel /> : null}

        {tab === 'review' ? (
          <InitiativeReviewGuide
            reqs={reqs}
            checks={checks}
            onToggleCheck={(id) => setChecks((prev) => ({ ...prev, [id]: !prev[id] }))}
            onJump={jump}
          />
        ) : null}
      </div>

      <InitiativeCreateDialog
        open={dialogOpen}
        form={form}
        missingCount={missingCount}
        errorCount={errorCount}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
