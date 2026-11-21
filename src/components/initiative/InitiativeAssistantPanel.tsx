import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, ArrowRight, CheckCircle2, AlertCircle, Info, RotateCcw, Send, Sparkles, Wand2 } from 'lucide-react'
import { FIELD_GUIDES, type InitiativeFieldId } from '../../data/initiativeTemplate'
import type { FieldRequirement, FormIssue } from '../../utils/initiativeValidation'
import type { AutofillChange } from '../../utils/initiativeAutofill'

interface Props {
  reqs: FieldRequirement[]
  issues: FormIssue[]
  po: { done: number; total: number }
  elt: { done: number; total: number }
  autofillPreview: AutofillChange[]
  onApplyAutofill: () => void
  onJump: (field: InitiativeFieldId) => void
  onCreate: () => void
  onReset: () => void
  savedAt: string | null
}

function Gauge({ label, done, total, tone }: { label: string; done: number; total: number; tone: 'sky' | 'violet' }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const complete = total > 0 && done === total
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className={clsx('text-xs font-bold', complete ? 'text-emerald-600' : 'text-gray-900')}>
          {done}/{total}
          {complete ? ' ✓' : ''}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            complete ? 'bg-emerald-500' : tone === 'sky' ? 'bg-sky-500' : 'bg-violet-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const ISSUE_STYLE = {
  error: { icon: AlertCircle, cls: 'text-red-600' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600' },
  info: { icon: Info, cls: 'text-indigo-600' },
} as const

export default function InitiativeAssistantPanel({
  reqs,
  issues,
  po,
  elt,
  autofillPreview,
  onApplyAutofill,
  onJump,
  onCreate,
  onReset,
  savedAt,
}: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const missing = reqs.filter((r) => r.required && !r.filled)
  const errors = issues.filter((i) => i.level === 'error')
  const ready = missing.length === 0 && errors.length === 0

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-surface-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={15} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-gray-900">작성 어시스턴트</h3>
          {savedAt ? <span className="ml-auto text-[10px] text-gray-400">임시 저장 {savedAt}</span> : null}
        </div>
        <div className="space-y-3">
          <Gauge label="PO Review 준비" done={po.done} total={po.total} tone="sky" />
          <Gauge label="ELT Review 준비" done={elt.done} total={elt.total} tone="violet" />
        </div>

        <div className="mt-4 rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3">
          <div className="flex items-center gap-2">
            <Wand2 size={14} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-900">기본 필드 자동 입력</span>
            <span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {autofillPreview.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-indigo-900/70">
            Owner · PO 할당, Due Date ↔ Release Sprint, Fix Version, 과제 성격별 NA 기본값을 채웁니다. 입력한 값은 덮어쓰지 않습니다.
          </p>
          {autofillPreview.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="mt-2 text-[11px] font-semibold text-indigo-700 hover:underline"
              >
                {showPreview ? '미리보기 닫기' : '채워질 값 미리보기'}
              </button>
              {showPreview ? (
                <ul className="mt-2 space-y-1.5 rounded-md bg-white/80 p-2">
                  {autofillPreview.map((c) => (
                    <li key={c.field} className="text-[11px]">
                      <span className="font-semibold text-gray-800">{c.label}</span>
                      <span className="text-gray-400"> → </span>
                      <span className="font-mono text-gray-900">{c.value}</span>
                      <span className="block text-gray-500">{c.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onApplyAutofill()
                  setShowPreview(false)
                }}
                className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                {autofillPreview.length}개 필드 자동 입력
              </button>
            </>
          ) : (
            <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 size={13} /> 자동으로 채울 수 있는 항목을 모두 채웠습니다
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">필수 입력 누락</h3>
          <span className={clsx('text-xs font-bold', missing.length ? 'text-red-600' : 'text-emerald-600')}>
            {missing.length ? `${missing.length}건` : '없음'}
          </span>
        </div>
        {missing.length ? (
          <ul className="max-h-64 space-y-1 overflow-auto pr-1">
            {missing.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onJump(r.id)}
                  className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-red-50"
                >
                  <span
                    className={clsx(
                      'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                      r.stage === 'po' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
                    )}
                  >
                    {r.stage === 'po' ? 'PO' : 'ELT'}
                  </span>
                  <span className="flex-1 text-gray-800">{FIELD_GUIDES[r.id].label}</span>
                  {r.reason ? <span className="text-[10px] text-amber-700">{r.reason}</span> : null}
                  <ArrowRight size={12} className="text-gray-300 group-hover:text-red-500" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 size={14} /> 모든 필수 항목이 입력되었습니다
          </p>
        )}
      </div>

      {issues.length > 0 ? (
        <div className="rounded-xl border border-surface-border bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-gray-900">규칙 알림</h3>
          <ul className="space-y-1.5">
            {issues.map((i) => {
              const { icon: Icon, cls } = ISSUE_STYLE[i.level]
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => onJump(i.field)} className="flex w-full gap-2 rounded-md px-1 py-1 text-left text-xs hover:bg-surface-page">
                    <Icon size={14} className={clsx('mt-0.5 shrink-0', cls)} />
                    <span className="text-gray-700">
                      <span className="font-semibold text-gray-900">{FIELD_GUIDES[i.field].label}</span> — {i.message}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={onCreate}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-sm transition',
            ready ? 'bg-lg-red text-white hover:bg-lg-red-mid' : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
        >
          <Send size={15} />
          {ready ? 'Initiative 생성 검토' : `생성 검토 (누락 ${missing.length} · 오류 ${errors.length})`}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-500 hover:bg-white hover:text-gray-800"
        >
          <RotateCcw size={12} /> 초안 비우기
        </button>
      </div>
    </div>
  )
}
