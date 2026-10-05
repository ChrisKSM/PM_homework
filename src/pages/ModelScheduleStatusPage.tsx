import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink, Filter, Loader2, X } from 'lucide-react'
import clsx from 'clsx'
import Header from '../components/layout/Header'
import ModelStatusEventsTable from '../components/modelStatus/ModelStatusEventsTable'
import ModelStatusMetaCard from '../components/modelStatus/ModelStatusMetaCard'
import OverviewScheduleTable from '../components/modelSchedule/OverviewScheduleTable'
import { modelScheduleApi } from '../api/modelScheduleApi'
import { OVERVIEW_MOCK_MODELS } from '../data/modelScheduleOverviewMock'
import type { OverviewModel } from '../types/modelScheduleOverview'
import {
  expandOverviewToDisplayRows,
  normalizeOverviewCategory,
  prepareOverviewModels,
} from '../utils/modelScheduleOverviewRows'

/** Jira 책임자 대시보드 연동 모델 (board 12641 — S80C) */
const JIRA_LINKED_MODELS = new Set(['S80C'])

function dayStart(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function uniqSorted(vals: string[]) {
  return [...new Set(vals.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
}

export default function ModelScheduleStatusPage() {
  const [models, setModels] = useState<OverviewModel[]>(() => prepareOverviewModels(OVERVIEW_MOCK_MODELS))
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'mongo' | 'local' | 'mock'>('mock')
  const [fCat, setFCat] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date()
    return { year: t.getFullYear(), month: t.getMonth() }
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    modelScheduleApi
      .loadOverview()
      .then((res) => {
        if (cancelled) return
        if (res.models.length > 0) {
          setModels(prepareOverviewModels(res.models as OverviewModel[]))
          setDataSource(res.source === 'default' ? 'mock' : res.source)
        } else {
          setModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
          setDataSource('mock')
        }
      })
      .catch(() => {
        if (cancelled) return
        setModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
        setDataSource('mock')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sortedModels = useMemo(() => prepareOverviewModels(models), [models])
  const categoryOptions = useMemo(() => uniqSorted(sortedModels.map((m) => m.category)), [sortedModels])
  const filteredModels = useMemo(
    () => sortedModels.filter((m) => !fCat || m.category === fCat),
    [sortedModels, fCat],
  )

  useEffect(() => {
    if (!filteredModels.length) return
    if (!filteredModels.some((m) => m.id === selectedId)) {
      setSelectedId(filteredModels[0].id)
    }
  }, [filteredModels, selectedId])

  const selected = useMemo(
    () => sortedModels.find((m) => m.id === selectedId) ?? filteredModels[0],
    [sortedModels, filteredModels, selectedId],
  )

  const monthDays = useMemo(() => daysInMonth(viewMonth.year, viewMonth.month), [viewMonth])
  const dates = useMemo(
    () =>
      Array.from({ length: monthDays }, (_, i) =>
        dayStart(new Date(viewMonth.year, viewMonth.month, i + 1)),
      ),
    [viewMonth, monthDays],
  )
  const today = dayStart(new Date())
  const todayOff = useMemo(() => {
    if (today.getFullYear() !== viewMonth.year || today.getMonth() !== viewMonth.month) return -1
    return today.getDate() - 1
  }, [today, viewMonth])

  const displayRows = useMemo(
    () => (selected ? expandOverviewToDisplayRows([selected]) : []),
    [selected],
  )

  const showJira = selected ? JIRA_LINKED_MODELS.has(selected.model.trim()) : false
  const hasFilter = Boolean(fCat)

  return (
    <>
      <Header
        title="모델현황"
        subtitle={
          selected
            ? `${selected.category} · ${selected.model} · ${selected.variant || '-'} — ${dataSource}`
            : '모델을 선택하세요'
        }
      />

      <div className="pt-16 p-6 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            일정 데이터 로드 중…
          </div>
        )}

        <div className="border border-surface-border rounded-xl bg-white p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={fCat}
              onChange={(e) => setFCat(e.target.value)}
              className={clsx(
                'text-[10px] px-1.5 py-1 rounded border bg-white cursor-pointer',
                fCat ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-gray-200 text-gray-500',
              )}
            >
              <option value="">카테고리 ▾</option>
              {categoryOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {hasFilter && (
              <button
                type="button"
                onClick={() => setFCat('')}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-red-500 hover:bg-red-50"
              >
                <X size={10} />
                초기화
              </button>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">
              {filteredModels.length}/{sortedModels.length}모델
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {filteredModels.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedId(m.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors',
                  selectedId === m.id
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
                )}
                title={m.category}
              >
                {m.model}
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <>
            <ModelStatusMetaCard model={selected} />
            <ModelStatusEventsTable model={selected} />

            <div className="border border-surface-border rounded-xl bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-800">월간 타임라인</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth((p) => {
                        const d = new Date(p.year, p.month - 1, 1)
                        return { year: d.getFullYear(), month: d.getMonth() }
                      })
                    }
                    className="p-1 rounded border border-surface-border hover:bg-white"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-gray-600 min-w-[72px] text-center">
                    {viewMonth.year % 100}/{viewMonth.month + 1}월
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setViewMonth((p) => {
                        const d = new Date(p.year, p.month + 1, 1)
                        return { year: d.getFullYear(), month: d.getMonth() }
                      })
                    }
                    className="p-1 rounded border border-surface-border hover:bg-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="p-2 overflow-x-auto">
                <OverviewScheduleTable displayRows={displayRows} dates={dates} todayOff={todayOff} />
              </div>
            </div>

            <div className="border border-surface-border rounded-xl bg-white p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">조직 KPI (Jira)</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  모델현황은 overview 일정·메타 중심 · Jira KPI는 별도 대시보드
                </p>
              </div>
              {showJira ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center space-y-3">
                  <p className="text-sm text-gray-700">
                    {selected.model} Jira KPI (Epic, Velocity, 리스크)는 S80C 책임자 대시보드에서 확인하세요.
                  </p>
                  <Link
                    to="/s80c/manager"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    S80C 책임자 대시보드
                    <ExternalLink size={14} />
                  </Link>
                  <p className="text-[10px] text-gray-500">
                    BE Jira 502 시 — be-audio-test pod .env JIRA_API_TOKEN 확인
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                  <p className="text-sm text-gray-500">해당 모델의 Jira KPI 연동은 준비 중입니다.</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    일정·메타는 위 overview 데이터 · Sound Suite{' '}
                    {sortedModels.filter((m) => normalizeOverviewCategory(m.category) === 'Sound Suite').length}모델
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">표시할 모델이 없습니다.</p>
        )}
      </div>
    </>
  )
}
