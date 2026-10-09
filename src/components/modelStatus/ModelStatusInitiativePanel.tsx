import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ExternalLink, Filter } from 'lucide-react'
import type { ModelStatusInitiativeIssue } from '../../types/modelStatusInitiative'
import { MODEL_STATUS_INITIATIVE_ALL } from '../../data/modelStatusInitiativeMock'
import { jiraBrowseUrl } from '../../utils/jiraBrowseUrl'
import { canonicalModelName } from '../../utils/modelScheduleRows'

type ColFilter = {
  key: string
  summary: string
  status: string
  due: string
  assignee: string
  product: string
  event: string
  pm: string
}

const EMPTY_FILTERS: ColFilter = {
  key: '',
  summary: '',
  status: '',
  due: '',
  assignee: '',
  product: '',
  event: '',
  pm: '',
}

const STATUS_CARD_META: Array<{
  id: string
  label: string
  match: (s: string) => boolean
  valueClass: string
}> = [
  { id: 'total', label: 'Total', match: () => true, valueClass: 'text-red-600' },
  { id: 'delivered', label: 'Delivered', match: (s) => s === 'Delivered', valueClass: 'text-emerald-600' },
  { id: 'closed', label: 'Closed', match: (s) => s === 'Closed', valueClass: 'text-emerald-600' },
  { id: 'inprogress', label: 'In Progress', match: (s) => s === 'In Progress', valueClass: 'text-blue-600' },
  { id: 'drafting', label: 'DRAFTING', match: (s) => s === 'DRAFTING', valueClass: 'text-red-600' },
  { id: 'suspended', label: 'Suspended', match: (s) => s === 'Suspended', valueClass: 'text-red-600' },
  { id: 'elt', label: 'ELT REVIEW', match: (s) => s === 'ELT REVIEW', valueClass: 'text-red-600' },
  { id: 'deferred', label: 'Deferred', match: (s) => s === 'Deferred', valueClass: 'text-red-600' },
]

function uniq(vals: string[]) {
  return [...new Set(vals.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
}

function matchFilter(row: ModelStatusInitiativeIssue, f: ColFilter): boolean {
  const contains = (cell: string, q: string) => !q || cell.toLowerCase().includes(q.toLowerCase())
  return (
    contains(row.key, f.key) &&
    contains(row.summary, f.summary) &&
    contains(String(row.status), f.status) &&
    contains(row.due, f.due) &&
    contains(row.assignee, f.assignee) &&
    contains(row.product, f.product) &&
    contains(row.event, f.event) &&
    contains(row.pm, f.pm)
  )
}

export interface ModelStatusInitiativePanelProps {
  modelCode: string
  /** 제품군 라벨 — product 필터 힌트 */
  productGroupLabel?: string
  issues?: ModelStatusInitiativeIssue[]
}

export default function ModelStatusInitiativePanel({
  modelCode,
  productGroupLabel,
  issues = MODEL_STATUS_INITIATIVE_ALL,
}: ModelStatusInitiativePanelProps) {
  const [filters, setFilters] = useState<ColFilter>({ ...EMPTY_FILTERS })
  const [statusCardFilter, setStatusCardFilter] = useState<string | null>(null)

  const scoped = useMemo(() => {
    const norm = canonicalModelName(modelCode)
    return issues.filter((r) => {
      if (!r.model) return true
      return canonicalModelName(r.model) === norm
    })
  }, [issues, modelCode])

  const baseForCards = scoped.length >= 10 ? scoped : issues

  const cardCounts = useMemo(() => {
    return STATUS_CARD_META.map((c) => {
      if (c.id === 'total') return { ...c, count: baseForCards.length }
      return { ...c, count: baseForCards.filter((r) => c.match(String(r.status))).length }
    })
  }, [baseForCards])

  const filtered = useMemo(() => {
    let rows = scoped.length ? scoped : issues
    if (statusCardFilter && statusCardFilter !== 'total') {
      const meta = STATUS_CARD_META.find((c) => c.id === statusCardFilter)
      if (meta) rows = rows.filter((r) => meta.match(String(r.status)))
    }
    return rows.filter((r) => matchFilter(r, filters))
  }, [scoped, issues, filters, statusCardFilter])

  const options = useMemo(
    () => ({
      status: uniq(issues.map((r) => String(r.status))),
      product: uniq(issues.map((r) => r.product)),
      event: uniq(issues.map((r) => r.event)),
      assignee: uniq(issues.map((r) => r.assignee)),
      pm: uniq(issues.map((r) => r.pm)),
    }),
    [issues],
  )

  const setF = (key: keyof ColFilter, value: string) => setFilters((p) => ({ ...p, [key]: value }))

  const FilterSelect = ({
    col,
    options: opts,
    placeholder,
  }: {
    col: keyof ColFilter
    options?: string[]
    placeholder: string
  }) => (
    <select
      value={filters[col]}
      onChange={(e) => setF(col, e.target.value)}
      className={clsx(
        'mt-1 w-full max-w-[140px] text-[10px] px-1 py-0.5 rounded border bg-white',
        filters[col] ? 'border-blue-400 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500',
      )}
    >
      <option value="">{placeholder}</option>
      {(opts ?? []).map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <Filter size={14} className="text-gray-400" />
        <span>
          {productGroupLabel ? `${productGroupLabel} · ` : ''}
          {modelCode.replace(/_/g, ' ')} — Initiative (mock · Jira 연동 준비)
        </span>
        {(filters.key ||
          filters.summary ||
          filters.status ||
          filters.due ||
          filters.assignee ||
          filters.product ||
          filters.event ||
          filters.pm ||
          statusCardFilter) && (
          <button
            type="button"
            className="text-red-500 hover:underline ml-2"
            onClick={() => {
              setFilters({ ...EMPTY_FILTERS })
              setStatusCardFilter(null)
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {cardCounts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStatusCardFilter(statusCardFilter === c.id ? null : c.id)}
            className={clsx(
              'rounded-xl border bg-white px-3 py-3 text-left transition-shadow hover:shadow-sm',
              statusCardFilter === c.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200',
            )}
          >
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className={clsx('text-2xl font-bold mt-1 tabular-nums', c.valueClass)}>{c.count}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 font-medium">{filtered.length}건</p>

      <div className="border border-surface-border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-[11px] border-collapse min-w-[960px]">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-2 font-semibold text-gray-600 w-10">#</th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[120px]">
                  Key
                  <input
                    value={filters.key}
                    onChange={(e) => setF('key', e.target.value)}
                    placeholder="필터"
                    className="mt-1 block w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded"
                  />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[220px]">
                  Summary
                  <input
                    value={filters.summary}
                    onChange={(e) => setF('summary', e.target.value)}
                    placeholder="필터"
                    className="mt-1 block w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded"
                  />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600">
                  Status
                  <FilterSelect col="status" options={options.status} placeholder="전체 ▾" />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600">
                  Due
                  <input
                    value={filters.due}
                    onChange={(e) => setF('due', e.target.value)}
                    placeholder="YYYY"
                    className="mt-1 block w-full max-w-[100px] text-[10px] px-1 py-0.5 border border-gray-200 rounded"
                  />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[120px]">
                  Assignee
                  <FilterSelect col="assignee" options={options.assignee} placeholder="전체 ▾" />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600">
                  Product
                  <FilterSelect col="product" options={options.product} placeholder="전체 ▾" />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600">
                  Event
                  <FilterSelect col="event" options={options.event} placeholder="전체 ▾" />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[100px]">
                  PM
                  <FilterSelect col="pm" options={options.pm} placeholder="전체 ▾" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const url = jiraBrowseUrl(row.key, row.issueUrl)
                return (
                  <tr key={row.key} className={clsx('border-b border-gray-100 hover:bg-blue-50/40', i % 2 === 1 && 'bg-gray-50/50')}>
                    <td className="p-2 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="p-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-mono text-blue-600 font-bold hover:underline"
                      >
                        {row.key}
                        <ExternalLink size={10} className="opacity-60" />
                      </a>
                    </td>
                    <td className="p-2 text-gray-800">{row.summary}</td>
                    <td className="p-2">
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                          row.status === 'In Progress' && 'bg-blue-50 text-blue-700',
                          (row.status === 'Delivered' || row.status === 'Closed') && 'bg-emerald-50 text-emerald-700',
                          (row.status === 'DRAFTING' ||
                            row.status === 'Suspended' ||
                            row.status === 'ELT REVIEW' ||
                            row.status === 'Deferred') &&
                            'bg-red-50 text-red-700',
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-2 text-gray-600 whitespace-nowrap">{row.due}</td>
                    <td className="p-2 text-gray-600">{row.assignee}</td>
                    <td className="p-2 text-gray-600">{row.product}</td>
                    <td className="p-2 text-gray-600">{row.event}</td>
                    <td className="p-2 text-gray-600">{row.pm}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p className="p-8 text-center text-sm text-gray-400">조건에 맞는 Initiative 없음</p>}
      </div>

      <p className="text-[10px] text-gray-400">
        Key 클릭 → Jira ({jiraBrowseUrl('TVPLAT-000000').replace(/TVPLAT-000000$/, '')}…)
      </p>
    </div>
  )
}
