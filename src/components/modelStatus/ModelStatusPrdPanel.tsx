import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ExternalLink, Filter, Loader2 } from 'lucide-react'
import { modelStatusApi } from '../../api/modelStatusApi'
import { useModelStatusPrd } from '../../hooks/useModelStatusPrd'
import type { ModelStatusPrdItem } from '../../types/modelStatusPrd'
import {
  PRD_LABEL_UNASSIGNED,
  PRD_WORKFLOW_COLUMNS,
  type PrdWorkflowStageId,
  reviewLabelSortKey,
} from '../../utils/modelStatusPrdWorkflow'

type SortMode = 'status' | 'reviewLabel'

type RowFilter = {
  id: string
  title: string
  status: string
  assignee: string
  almLabel: string
}

const EMPTY_FILTER: RowFilter = { id: '', title: '', status: '', assignee: '', almLabel: '' }

const CARD_STYLES: Record<string, string> = {
  draft: 'text-gray-700',
  review_request: 'text-amber-600',
  review_approved: 'text-blue-600',
  dev_review: 'text-indigo-600',
  planning_review: 'text-violet-600',
  dev_approved: 'text-emerald-600',
  rejected: 'text-red-600',
  other: 'text-gray-500',
  total: 'text-red-600',
}

function uniq(vals: string[]) {
  return [...new Set(vals.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
}

function displayReviewLabel(raw: string | undefined) {
  const t = (raw || '').trim()
  return t || PRD_LABEL_UNASSIGNED
}

function matchRow(row: ModelStatusPrdItem, f: RowFilter): boolean {
  const contains = (cell: string, q: string) => !q || cell.toLowerCase().includes(q.toLowerCase())
  const alm = (row.almLabels || []).join(' ')
  return (
    contains(row.id, f.id) &&
    contains(row.title, f.title) &&
    contains(row.status, f.status) &&
    contains(row.assignee, f.assignee) &&
    contains(alm, f.almLabel)
  )
}

export interface ModelStatusPrdPanelProps {
  modelCode: string
  active?: boolean
}

export default function ModelStatusPrdPanel({ modelCode, active = true }: ModelStatusPrdPanelProps) {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<RowFilter>({ ...EMPTY_FILTER })
  const [stageFilter, setStageFilter] = useState<PrdWorkflowStageId | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('status')
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({})

  const queryKey = ['model-status-prd', modelCode]
  const { data, isPending, isFetching, isError, error, refetch, fetchStatus } = useModelStatusPrd(
    modelCode,
    active,
  )

  const saveLabel = useMutation({
    mutationFn: (args: { prdId: string; reviewLabel: string; almLabels: string[] }) =>
      modelStatusApi.savePrdReviewLabel({
        model: modelCode,
        prdId: args.prdId,
        reviewLabel: args.reviewLabel,
        almLabels: args.almLabels,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })

  const items = data?.items ?? []
  const workflowColumns = data?.workflowColumns?.length ? data.workflowColumns : PRD_WORKFLOW_COLUMNS
  const meta = data?.meta

  const labelOptions = useMemo(() => {
    const fromAlm = items.flatMap((r) => r.almLabels || [])
    const fromReview = items.map((r) => (r.reviewLabel || '').trim()).filter(Boolean)
    return uniq([...fromReview, ...fromAlm])
  }, [items])

  const cardCounts = useMemo(() => {
    const cols = workflowColumns.map((c) => ({
      ...c,
      count: items.filter((r) => r.workflowStageId === c.id).length,
    }))
    return [
      { id: 'total' as const, label: 'Total', order: 0, count: items.length },
      ...cols,
      {
        id: 'other' as const,
        label: '기타',
        order: 99,
        count: items.filter((r) => r.workflowStageId === 'other' || !r.workflowStageId).length,
      },
    ]
  }, [items, workflowColumns])

  const filtered = useMemo(() => {
    let rows = items.filter((r) => matchRow(r, filters))
    if (stageFilter && stageFilter !== 'total') {
      rows = rows.filter((r) =>
        stageFilter === 'other'
          ? r.workflowStageId === 'other' || !r.workflowStageId
          : r.workflowStageId === stageFilter,
      )
    }
    if (sortMode === 'reviewLabel') {
      rows = [...rows].sort((a, b) =>
        reviewLabelSortKey(a.reviewLabel || '').localeCompare(reviewLabelSortKey(b.reviewLabel || ''), 'ko'),
      )
    } else {
      rows = [...rows].sort((a, b) => {
        const oa = a.workflowOrder ?? 99
        const ob = b.workflowOrder ?? 99
        if (oa !== ob) return oa - ob
        return a.id.localeCompare(b.id)
      })
    }
    return rows
  }, [items, filters, stageFilter, sortMode])

  const groupedByReviewLabel = useMemo(() => {
    const map = new Map<string, ModelStatusPrdItem[]>()
    for (const row of filtered) {
      const key = displayReviewLabel(row.reviewLabel)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return [...map.entries()].sort(([a], [b]) => reviewLabelSortKey(a).localeCompare(reviewLabelSortKey(b), 'ko'))
  }, [filtered])

  const setF = (key: keyof RowFilter, value: string) => setFilters((p) => ({ ...p, [key]: value }))

  const onSaveLabel = (row: ModelStatusPrdItem) => {
    const next = (draftLabels[row.id] ?? row.reviewLabel ?? '').trim()
    saveLabel.mutate({ prdId: row.id, reviewLabel: next, almLabels: row.almLabels || [] })
    setDraftLabels((p) => {
      const n = { ...p }
      delete n[row.id]
      return n
    })
  }

  if (!active) {
    return null
  }

  if (!modelCode?.trim()) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-4 py-6 text-center">
        모델을 선택하면 PRD(ALM)를 조회합니다.
      </p>
    )
  }

  if (isPending || (fetchStatus === 'idle' && !data)) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
        <Loader2 size={16} className="animate-spin" />
        ALM PRD 조회 중… ({modelCode})
      </div>
    )
  }

  if (isError) {
    const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '조회 실패'
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold mb-1">PRD ALM 조회 실패</p>
        <p className="text-xs">{String(msg)}</p>
        <p className="text-[10px] mt-2 text-red-700">Network: GET /api/model-status/prd?model={modelCode}</p>
        <button type="button" className="mt-2 text-xs underline" onClick={() => refetch()}>
          다시 시도
        </button>
      </div>
    )
  }

  const renderPrdRow = (row: ModelStatusPrdItem, index: number) => {
    const draft = draftLabels[row.id] ?? row.reviewLabel ?? ''
    const dirty = draft !== (row.reviewLabel || '')
    return (
      <tr
        key={row.id}
        className={clsx('border-b border-gray-100 hover:bg-blue-50/40', index % 2 === 1 && 'bg-gray-50/50')}
      >
        <td className="p-2 text-gray-400 tabular-nums">{index + 1}</td>
        <td className="p-2 whitespace-nowrap">
          {row.polarionUrl ? (
            <a
              href={row.polarionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-mono text-blue-600 font-bold hover:underline text-[11px]"
            >
              {row.id}
              <ExternalLink size={10} className="opacity-60" />
            </a>
          ) : (
            row.id
          )}
        </td>
        <td className="p-2 text-gray-800 max-w-md truncate" title={row.title}>
          {row.title}
        </td>
        <td className="p-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
            {row.workflowStageLabel || row.status || '—'}
          </span>
        </td>
        <td className="p-2 text-gray-600">{row.assignee || '—'}</td>
        <td className="p-2 text-gray-600 text-[10px]">
          {(row.almLabels || []).length ? (
            <span className="inline-flex flex-wrap gap-1">
              {row.almLabels!.map((lb) => (
                <span key={lb} className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">
                  {lb}
                </span>
              ))}
            </span>
          ) : (
            '—'
          )}
        </td>
        <td className="p-2 min-w-[160px]">
          <div className="flex items-center gap-1">
            <input
              list={`prd-label-options-${modelCode}`}
              value={draft}
              onChange={(e) => setDraftLabels((p) => ({ ...p, [row.id]: e.target.value }))}
              placeholder="검토 라벨"
              className="w-full text-[10px] px-1.5 py-1 border border-gray-200 rounded"
            />
            <button
              type="button"
              disabled={!dirty || saveLabel.isPending}
              onClick={() => onSaveLabel(row)}
              className="shrink-0 text-[10px] px-1.5 py-1 rounded border border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-40"
            >
              저장
            </button>
          </div>
        </td>
        <td className="p-2 text-[10px] text-gray-500">{row.applyModel || '—'}</td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      <datalist id={`prd-label-options-${modelCode}`}>
        {labelOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
        <Filter size={14} className="text-gray-400" />
        {isFetching ? <Loader2 size={14} className="animate-spin text-violet-500" /> : null}
        <span>
          {modelCode.replace(/_/g, ' ')} — PRD (ALM · {meta?.source ?? '—'}, {items.length}건)
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-white disabled:opacity-50"
        >
          새로고침
        </button>
        <label className="ml-auto flex items-center gap-1 text-[10px]">
          정렬
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="border border-gray-200 rounded px-1 py-0.5 bg-white"
          >
            <option value="status">상태 순</option>
            <option value="reviewLabel">검토 라벨</option>
          </select>
        </label>
      </div>

      {meta?.labelStore && !meta.labelStore.milvusOk && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          검토 라벨 저장소(Milvus) 연결 실패 — 읽기 전용. {meta.labelStore.error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
        {cardCounts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStageFilter(stageFilter === c.id ? null : c.id)}
            className={clsx(
              'rounded-xl border bg-white px-3 py-3 text-left transition-shadow hover:shadow-sm',
              stageFilter === c.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200',
            )}
          >
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
            <p className={clsx('text-2xl font-bold mt-1 tabular-nums', CARD_STYLES[c.id] || 'text-gray-700')}>
              {c.count}
            </p>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 font-medium">{filtered.length}건</p>

      <div className="border border-surface-border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="px-3 py-2 border-b bg-gray-50 text-[11px] font-semibold text-gray-700">PRD 목록</div>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-[11px] border-collapse min-w-[980px]">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-2 font-semibold text-gray-600 w-10">#</th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[100px]">
                  ID
                  <input
                    value={filters.id}
                    onChange={(e) => setF('id', e.target.value)}
                    className="mt-1 block w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded"
                    placeholder="필터"
                  />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[200px]">
                  Title
                  <input
                    value={filters.title}
                    onChange={(e) => setF('title', e.target.value)}
                    className="mt-1 block w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded"
                    placeholder="필터"
                  />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[90px]">Status</th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[80px]">Assignee</th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[120px]">
                  ALM labels
                  <input
                    value={filters.almLabel}
                    onChange={(e) => setF('almLabel', e.target.value)}
                    className="mt-1 block w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded"
                    placeholder="필터"
                  />
                </th>
                <th className="text-left p-2 font-semibold text-gray-600 min-w-[160px]">검토 라벨 (저장)</th>
                <th className="text-left p-2 font-semibold text-gray-600">적용모델</th>
              </tr>
            </thead>
            <tbody>
              {sortMode === 'reviewLabel'
                ? groupedByReviewLabel.flatMap(([label, rows]) => [
                    <tr key={`g-${label}`} className="bg-violet-50/80">
                      <td colSpan={8} className="px-3 py-2 text-[11px] font-semibold text-violet-800">
                        검토 라벨 · {label} ({rows.length})
                      </td>
                    </tr>,
                    ...rows.map((row, i) => renderPrdRow(row, i)),
                  ])
                : filtered.map((row, i) => renderPrdRow(row, i))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-400">
                    PRD 없음 (BE pod PRD API 패치 확인)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-surface-border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="px-3 py-2 border-b bg-violet-50 text-[11px] font-semibold text-violet-900">
          검토 라벨별 묶음 (ALM labels 참고 · Milvus 저장 라벨 기준)
        </div>
        <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
          {groupedByReviewLabel.map(([label, rows]) => (
            <div key={label} className="rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{label}</span>
                <span className="text-[10px] text-gray-500">{rows.length}건</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <li key={r.id} className="px-3 py-2 text-[11px] flex flex-wrap gap-2 items-start">
                    <a
                      href={r.polarionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-600 font-bold shrink-0"
                    >
                      {r.id}
                    </a>
                    <span className="text-gray-800 flex-1 min-w-[200px]">{r.title}</span>
                    <span className="text-gray-500 shrink-0">{r.workflowStageLabel}</span>
                    {(r.almLabels || []).length > 0 && (
                      <span className="text-[10px] text-slate-600">ALM: {r.almLabels!.join(', ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!groupedByReviewLabel.length && <p className="text-sm text-gray-400 text-center py-6">표시할 PRD 없음</p>}
        </div>
      </div>
    </div>
  )
}
