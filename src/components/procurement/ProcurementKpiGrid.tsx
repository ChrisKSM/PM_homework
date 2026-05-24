import clsx from 'clsx'
import type { ProcurementKpi } from '../../types/procurement'

interface Props {
  kpis: ProcurementKpi[]
}

function KpiGauge({ kpi }: { kpi: ProcurementKpi }) {
  const pct = Math.min(100, Math.max(0, kpi.actualPct))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{kpi.label}</p>
        <span className="text-xs text-gray-500 font-medium shrink-0">목표 {kpi.target}</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={clsx(
            'text-2xl font-bold',
            kpi.met ? 'text-emerald-600' : 'text-amber-600'
          )}
        >
          {kpi.actualPct}%
        </span>
        <span className="text-xs text-gray-500 font-medium">
          {kpi.numerator}/{kpi.denominator}
        </span>
        <span
          className={clsx(
            'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full',
            kpi.met ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}
        >
          {kpi.met ? '목표 달성' : '목표 미달'}
        </span>
      </div>

      <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-muted">
        <div
          className={clsx('transition-all', kpi.met ? 'bg-emerald-500' : 'bg-amber-500')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 font-medium leading-relaxed">
        100% = {kpi.formula}
      </p>
    </div>
  )
}

export default function ProcurementKpiGrid({ kpis }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="bg-white border border-surface-border rounded-xl p-5 border-t-[3px] border-t-lg-red"
        >
          <KpiGauge kpi={kpi} />
        </div>
      ))}
    </div>
  )
}
