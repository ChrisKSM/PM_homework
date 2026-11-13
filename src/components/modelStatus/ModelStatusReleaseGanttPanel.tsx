import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { ModelStatusProductGroupId } from '../../data/modelStatusCatalog'
import { defaultDeliveryFilters } from '../../data/modelStatusDeliveryFilters'
import { useDeliveryPortalData, useDeliveryPortalIsMock } from '../../hooks/useDeliveryPortalData'
import type { DeliveryAppliedFilters, DeliveryDetailRow } from '../../types/deliveryPortal'
import {
  collectFilterOptions,
  dayToPercent,
  filterDeliveryDetails,
  isScheduleDelayed,
  programOptionsFor,
  scheduleDateRange,
  socOptionsForPlatform,
  testBarColor,
  TEST_GROUP_COLORS,
} from '../../utils/deliveryPortalGantt'

interface Props {
  modelCode: string
  productGroupId: ModelStatusProductGroupId
  active: boolean
}

const ZOOM_MONTHS: Record<string, number> = { '3M': 3, '6M': 6, '1Y': 12 }

export default function ModelStatusReleaseGanttPanel({ modelCode, productGroupId, active }: Props) {
  const isMock = useDeliveryPortalIsMock()
  const { data, isLoading, error, refetch, isFetching } = useDeliveryPortalData(active)

  const defaults = useMemo(
    () => defaultDeliveryFilters(modelCode, productGroupId),
    [modelCode, productGroupId],
  )

  const [department, setDepartment] = useState(defaults.department ?? '')
  const [platform, setPlatform] = useState(defaults.platform ?? '')
  const [soc, setSoc] = useState(defaults.soc ?? '')
  const [program, setProgram] = useState('')
  const [status, setStatus] = useState('')
  const [applied, setApplied] = useState<DeliveryAppliedFilters | null>(null)
  const [zoomLevel, setZoomLevel] = useState<'3M' | '6M' | '1Y' | 'all'>('6M')
  const [zoomCenter, setZoomCenter] = useState(() => new Date())

  const { departments, platforms } = useMemo(() => collectFilterOptions(data ?? null), [data])

  useEffect(() => {
    setDepartment(defaults.department ?? '')
    setPlatform(defaults.platform ?? '')
    setSoc(defaults.soc ?? '')
    setProgram('')
    setStatus('')
    setApplied(null)
  }, [modelCode, productGroupId, defaults.department, defaults.platform, defaults.soc])

  useEffect(() => {
    if (!data || applied) return
    const plat = defaults.platform || platforms[0] || ''
    if (!plat) return
    setPlatform(plat)
    if (defaults.department) setDepartment(defaults.department)
    if (defaults.soc) setSoc(defaults.soc)
    setApplied({
      department: defaults.department ?? department,
      platform: plat,
      soc: defaults.soc ?? soc,
      program: '',
      status: '',
    })
  }, [data, platforms, defaults, applied, department, soc])

  const socOptions = useMemo(
    () => socOptionsForPlatform(data ?? null, department, platform),
    [data, department, platform],
  )
  const programOptions = useMemo(
    () => programOptionsFor(data ?? null, department, platform, soc),
    [data, department, platform, soc],
  )

  const handleFetch = useCallback(() => {
    if (!department || !platform) return
    setApplied({
      department,
      platform,
      soc,
      program,
      status,
    })
  }, [department, platform, soc, program, status])

  const rows = useMemo(
    () => (applied ? filterDeliveryDetails(data ?? null, applied) : []),
    [data, applied],
  )

  const viewRange = useMemo(() => {
    if (zoomLevel === 'all') {
      const r = scheduleDateRange(rows)
      if (r) return r
      const g = data?.global_data
      if (g?.global_min_from && g?.global_max_to) {
        return { min: new Date(g.global_min_from), max: new Date(g.global_max_to) }
      }
      return { min: new Date(), max: new Date(Date.now() + 86400000 * 180) }
    }
    const months = ZOOM_MONTHS[zoomLevel] ?? 6
    const half = months / 2
    const min = new Date(zoomCenter)
    min.setMonth(min.getMonth() - half)
    const max = new Date(zoomCenter)
    max.setMonth(max.getMonth() + half)
    return { min, max }
  }, [zoomLevel, zoomCenter, rows, data])

  const monthMarkers = useMemo(() => {
    const markers: { date: Date; label: string }[] = []
    const d = new Date(viewRange.min)
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    while (d <= viewRange.max) {
      markers.push({
        date: new Date(d),
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      })
      d.setMonth(d.getMonth() + 1)
    }
    return markers
  }, [viewRange])

  const programGroups = useMemo(() => {
    const g: Record<string, DeliveryDetailRow[]> = {}
    for (const r of rows) {
      const k = r._program || 'Unknown'
      if (!g[k]) g[k] = []
      g[k].push(r)
    }
    return g
  }, [rows])

  const errMsg = error instanceof Error ? error.message : error ? String(error) : ''

  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">릴리즈 Gantt · Delivery Portal 마일스톤</h3>
        <p className="text-[11px] text-gray-500 mt-1">
          Davis MilestonePage 연동 — Biz. Domain · Platform · SoC · Program 필터 후 SW 테스트 Plan/Actual
        </p>
        {isMock && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <strong>Mock UI</strong> — S80C / H7 샘플 일정 (Delivery Portal·BE 연동 전). 실 API는{' '}
            <code className="text-[10px]">REACT_APP_DELIVERY_PORTAL_MOCK=false</code> + BE{' '}
            <code className="text-[10px]">DELIVERY_PORTAL_API_TOKEN</code>
          </div>
        )}
      </div>

      {(isLoading || isFetching) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          Delivery Portal 로드 중…
        </div>
      )}

      {errMsg && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {errMsg}
          <p className="mt-2 text-gray-600">
            BE .env <code className="text-[10px]">DELIVERY_PORTAL_API_TOKEN</code> · uvicorn 8000 · Worker BE URL
          </p>
          <button type="button" className="mt-2 text-blue-600 underline" onClick={() => refetch()}>
            재시도
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 text-[11px]">
        <label className="flex flex-col gap-0.5">
          <span className="font-medium">
            Biz. Domain<span className="text-red-500">*</span>
          </span>
          <select
            className="border rounded-lg px-2 py-1.5 min-w-[88px]"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value)
              setPlatform('')
              setSoc('')
              setProgram('')
            }}
          >
            <option value="">선택</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="font-medium">
            Platform<span className="text-red-500">*</span>
          </span>
          <select
            className="border rounded-lg px-2 py-1.5 min-w-[100px]"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value)
              setSoc('')
              setProgram('')
            }}
          >
            <option value="">선택</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="font-medium">SoC</span>
          <select className="border rounded-lg px-2 py-1.5 min-w-[80px]" value={soc} onChange={(e) => setSoc(e.target.value)}>
            <option value="">All</option>
            {socOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="font-medium">Program</span>
          <select className="border rounded-lg px-2 py-1.5 min-w-[100px]" value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">All</option>
            {programOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold disabled:opacity-50"
          disabled={!department || !platform || isLoading}
          onClick={handleFetch}
        >
          조회
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" className="px-2 py-1 border rounded text-[10px]" onClick={() => setZoomCenter((c) => { const n = new Date(c); n.setMonth(n.getMonth() - 1); return n })}>
          ◀
        </button>
        {(['3M', '6M', '1Y', 'all'] as const).map((z) => (
          <button
            key={z}
            type="button"
            className={`px-2 py-1 rounded text-[10px] border ${zoomLevel === z ? 'bg-violet-100 border-violet-400' : ''}`}
            onClick={() => {
              setZoomLevel(z)
              if (z !== 'all') setZoomCenter(new Date())
            }}
          >
            {z === 'all' ? 'All' : z}
          </button>
        ))}
        <button type="button" className="px-2 py-1 border rounded text-[10px]" onClick={() => setZoomCenter((c) => { const n = new Date(c); n.setMonth(n.getMonth() + 1); return n })}>
          ▶
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center text-[10px] text-gray-600">
        {TEST_GROUP_COLORS.map(([name, color]) => (
          <span key={name} className="inline-flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>

      {!rows.length && applied && !isLoading && (
        <p className="text-center text-xs text-gray-400 py-8">조건에 맞는 일정 없음 — SoC/Program 조정</p>
      )}

      {Object.entries(programGroups).map(([progName, details]) => (
        <div key={progName} className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 text-xs font-bold text-gray-800">{progName}</div>
          {details.map((d, di) => (
            <div key={di} className="flex border-t border-gray-100 min-h-[72px]">
              <div className="w-28 shrink-0 p-2 text-[10px] border-r border-gray-100">
                <div className="font-bold">{d.soc}</div>
                <div className="text-gray-500">PL: {d.pl || '—'}</div>
                <div className="text-gray-500">{d.status || '—'}</div>
              </div>
              <div className="flex-1 relative h-[72px] bg-slate-50/50">
                {monthMarkers.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-gray-200/80"
                    style={{ left: `${dayToPercent(m.date.toISOString().slice(0, 10), viewRange.min, viewRange.max)}%` }}
                  />
                ))}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-violet-600 z-10"
                  style={{ left: `${dayToPercent(new Date().toISOString().slice(0, 10), viewRange.min, viewRange.max)}%` }}
                />
                {(d.schedules ?? []).map((s, si) => {
                  const color = testBarColor(s.test_name)
                  const hasPlan = s.plan_start_date && s.plan_end_date
                  const hasActual = s.actual_start_date && s.actual_end_date
                  const delayed = isScheduleDelayed(s)
                  return (
                    <div key={si} className="absolute inset-x-0" style={{ top: 8 + si * 14 }}>
                      {hasPlan && (
                        <div
                          className="absolute h-2.5 rounded-sm border text-[8px] leading-none truncate px-0.5"
                          style={{
                            left: `${dayToPercent(s.plan_start_date, viewRange.min, viewRange.max)}%`,
                            width: `${Math.max(0.5, dayToPercent(s.plan_end_date!, viewRange.min, viewRange.max) - dayToPercent(s.plan_start_date!, viewRange.min, viewRange.max))}%`,
                            background: `${color}33`,
                            borderColor: `${color}99`,
                          }}
                          title={`${s.test_name} Plan`}
                        />
                      )}
                      {hasActual && (
                        <div
                          className="absolute h-2.5 rounded-sm text-[8px] truncate"
                          style={{
                            left: `${dayToPercent(s.actual_start_date, viewRange.min, viewRange.max)}%`,
                            width: `${Math.max(0.5, dayToPercent(s.actual_end_date!, viewRange.min, viewRange.max) - dayToPercent(s.actual_start_date!, viewRange.min, viewRange.max))}%`,
                            background: delayed ? '#f59e0b' : color,
                          }}
                          title={`${s.test_name} Actual${delayed ? ' (Delayed)' : ''}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
