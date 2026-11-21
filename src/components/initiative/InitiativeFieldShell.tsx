import { useState, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Check, Info } from 'lucide-react'
import { FIELD_GUIDES, type InitiativeFieldId } from '../../data/initiativeTemplate'
import type { FieldRequirement } from '../../utils/initiativeValidation'

export const inputClass =
  'w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition'

interface FieldShellProps {
  id: InitiativeFieldId
  req?: FieldRequirement
  showMissing: boolean
  children: ReactNode
  aside?: ReactNode
  className?: string
}

export function FieldShell({ id, req, showMissing, children, aside, className }: FieldShellProps) {
  const [guideOpen, setGuideOpen] = useState(false)
  const guide = FIELD_GUIDES[id]
  const missing = showMissing && req?.required && !req.filled
  return (
    <div id={`field-${id}`} className={clsx('scroll-mt-24 rounded-lg transition', missing && 'ring-2 ring-red-200 ring-offset-4', className)}>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-[13px] font-semibold text-gray-800">{guide.label}</label>
        {req?.required ? (
          req.reason ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title={req.reason}>
              조건부 필수
            </span>
          ) : (
            <span className="text-xs font-bold text-lg-red">*</span>
          )
        ) : null}
        {req?.filled ? <Check size={13} className="text-emerald-500" /> : null}
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className={clsx(
            'ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition',
            guideOpen ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-indigo-600'
          )}
        >
          <Info size={12} /> 가이드
        </button>
        {aside}
      </div>
      {guideOpen ? (
        <p className="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs leading-relaxed text-indigo-900">
          {guide.guide}
          {req?.reason ? <span className="mt-1 block font-semibold text-amber-700">필수 조건: {req.reason}</span> : null}
        </p>
      ) : null}
      {children}
      {missing ? <p className="mt-1 text-[11px] font-medium text-red-600">필수 입력 항목입니다</p> : null}
    </div>
  )
}

interface ChoiceCardsProps {
  value: string
  options: { value: string; desc?: string }[]
  onChange: (v: string) => void
  columns?: 2 | 3 | 4 | 5 | 6
}

const COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3',
}

export function ChoiceCards({ value, options, onChange, columns = 3 }: ChoiceCardsProps) {
  return (
    <div className={clsx('grid gap-2', COLS[columns])}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? '' : o.value)}
            className={clsx(
              'group relative rounded-lg border px-3 py-2 text-left transition',
              active
                ? 'border-indigo-500 bg-indigo-50/70 shadow-[0_0_0_1px] shadow-indigo-500'
                : 'border-surface-border bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
            )}
          >
            <span className={clsx('block text-[13px] font-semibold', active ? 'text-indigo-700' : 'text-gray-800')}>{o.value}</span>
            {o.desc ? <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{o.desc}</span> : null}
            {active ? <Check size={14} className="absolute right-2 top-2 text-indigo-600" /> : null}
          </button>
        )
      })}
    </div>
  )
}

interface ChipSelectProps {
  values: string[]
  options: readonly string[] | { value: string; desc?: string }[]
  onToggle: (v: string) => void
}

export function ChipSelect({ values, options, onToggle }: ChipSelectProps) {
  const opts = (options as (string | { value: string; desc?: string })[]).map((o) =>
    typeof o === 'string' ? { value: o, desc: undefined } : o
  )
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => {
        const active = values.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            title={o.desc}
            onClick={() => onToggle(o.value)}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition',
              active
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-surface-border bg-white text-gray-700 hover:border-indigo-300'
            )}
          >
            {active ? <Check size={12} /> : null}
            {o.value}
          </button>
        )
      })}
    </div>
  )
}

export function SectionCard({
  index,
  title,
  stage,
  desc,
  children,
}: {
  index: number
  title: string
  stage: 'PO Review' | 'ELT Review'
  desc?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-surface-border bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-surface-border px-5 py-3.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs font-bold text-white">{index}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {desc ? <p className="text-[11px] text-gray-500">{desc}</p> : null}
        </div>
        <span
          className={clsx(
            'ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            stage === 'PO Review' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
          )}
        >
          {stage} 전까지
        </span>
      </header>
      <div className="space-y-5 px-5 py-5">{children}</div>
    </section>
  )
}
