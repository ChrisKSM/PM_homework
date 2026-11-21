import { clsx } from 'clsx'
import { Briefcase, CalendarRange, Check, ExternalLink, FileCode2, Layers, ShieldCheck, UsersRound } from 'lucide-react'
import {
  FIELD_GUIDES,
  INITIATIVE_TEMPLATE_KEY,
  JIRA_BASE_URL,
  REVIEW_AREA_LABEL,
  REVIEW_CHECKLIST,
  type InitiativeFieldId,
  type ReviewCheckItem,
  type ReviewStage,
} from '../../data/initiativeTemplate'
import type { FieldRequirement } from '../../utils/initiativeValidation'

interface Props {
  reqs: Record<InitiativeFieldId, FieldRequirement>
  checks: Record<string, boolean>
  onToggleCheck: (id: string) => void
  onJump: (field: InitiativeFieldId) => void
}

const AREA_ICON: Record<ReviewCheckItem['area'], typeof Briefcase> = {
  biz: Briefcase,
  scope: Layers,
  spec: FileCode2,
  schedule: CalendarRange,
}

const STAGE_META: Record<ReviewStage, { title: string; who: string; goal: string; tone: string; badge: string }> = {
  po: {
    title: 'PO Review',
    who: 'PO · Reporter',
    goal: 'Biz. 가치와 우선순위를 판단하고 Initiative Owner를 확정합니다.',
    tone: 'from-sky-50',
    badge: 'bg-sky-600',
  },
  elt: {
    title: 'ELT Review',
    who: 'ELT · Owner · PO · Architect',
    goal: '개발 범위 · Spec · 일정(Release Sprint)을 확정하고 착수 여부를 결정합니다.',
    tone: 'from-violet-50',
    badge: 'bg-violet-600',
  },
}

const KEY_RULES = [
  'Release Sprint = Due Date. 변경은 조직책임자 승인 후 완료 -1 Sprint 시작 전(Due Date 4주 전)까지',
  'Scope of Change가 NA가 아니면 ARCH REVIEW 진행, 아키텍트가 최종 결정',
  'Categorization = Product → SRS · Branch · Risk 및 요청사항 · Test Plan 필수',
  'PoC · Product → Component/s · 설계 변경 영향도 필수',
  'BSP 변경 → Device 동시 선택 + SoC Dependency 업체 지정',
  'Estimated Effort는 Milestone 예상 SP 합과 일치 (1 SP = 4h)',
]

function StageColumn({ stage, reqs, checks, onToggleCheck, onJump }: Props & { stage: ReviewStage }) {
  const meta = STAGE_META[stage]
  const items = REVIEW_CHECKLIST[stage]
  const areas = (Object.keys(REVIEW_AREA_LABEL) as ReviewCheckItem['area'][]).filter((a) => items.some((i) => i.area === a))
  const checked = items.filter((i) => checks[i.id]).length

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
      <header className={clsx('border-b border-surface-border bg-gradient-to-b to-white px-5 py-4', meta.tone)}>
        <div className="flex items-center gap-2">
          <span className={clsx('rounded-md px-2 py-0.5 text-[11px] font-bold uppercase text-white', meta.badge)}>{meta.title}</span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <UsersRound size={12} /> {meta.who}
          </span>
          <span className="ml-auto text-xs font-bold text-gray-700">
            {checked}/{items.length} 확인
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{meta.goal}</p>
      </header>
      <div className="flex-1 space-y-4 px-5 py-4">
        {areas.map((area) => {
          const Icon = AREA_ICON[area]
          return (
            <div key={area}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <Icon size={13} /> {REVIEW_AREA_LABEL[area]}
              </div>
              <ul className="space-y-1.5">
                {items
                  .filter((i) => i.area === area)
                  .map((item) => {
                    const done = Boolean(checks[item.id])
                    return (
                      <li
                        key={item.id}
                        className={clsx(
                          'rounded-lg border px-3 py-2.5 transition',
                          done ? 'border-emerald-200 bg-emerald-50/50' : 'border-surface-border hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => onToggleCheck(item.id)}
                            aria-label={`${item.text} 확인`}
                            className={clsx(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                              done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 bg-white hover:border-emerald-400'
                            )}
                          >
                            {done ? <Check size={11} strokeWidth={3} /> : null}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={clsx('text-[13px] leading-snug', done ? 'text-gray-500 line-through' : 'text-gray-800')}>{item.text}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.fields.map((f) => {
                                const r = reqs[f]
                                return (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => onJump(f)}
                                    title="초안에서 보기"
                                    className={clsx(
                                      'rounded-full px-2 py-0.5 text-[10px] font-semibold transition hover:ring-1',
                                      r.filled
                                        ? 'bg-emerald-50 text-emerald-700 hover:ring-emerald-300'
                                        : r.required
                                          ? 'bg-red-50 text-red-600 hover:ring-red-300'
                                          : 'bg-gray-100 text-gray-500 hover:ring-gray-300'
                                    )}
                                  >
                                    {r.filled ? '✓' : r.required ? '!' : '·'} {FIELD_GUIDES[f].label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function InitiativeReviewGuide(props: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <StageColumn stage="po" {...props} />
        <StageColumn stage="elt" {...props} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-surface-border bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <ShieldCheck size={15} className="text-lg-red" /> 핵심 규칙
          </h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {KEY_RULES.map((rule) => (
              <li key={rule} className="rounded-lg bg-surface-page px-3 py-2 text-xs leading-relaxed text-gray-700">
                {rule}
              </li>
            ))}
          </ul>
        </section>
        <a
          href={`${JIRA_BASE_URL}/${INITIATIVE_TEMPLATE_KEY}`}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col justify-between rounded-xl border border-surface-border bg-gray-900 p-5 text-white shadow-sm transition hover:bg-gray-800"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">원본 가이드</p>
            <p className="mt-1 text-lg font-bold">{INITIATIVE_TEMPLATE_KEY}</p>
            <p className="mt-1 text-xs text-gray-300">Initiative Template · DRAFTING 작성 가이드</p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-gray-200 group-hover:text-white">
            Jira에서 열기 <ExternalLink size={12} />
          </span>
        </a>
      </div>
    </div>
  )
}
