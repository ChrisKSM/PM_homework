import MetaTooltipCell from '../modelSchedule/MetaTooltipCell'
import type { OverviewModel } from '../../types/modelScheduleOverview'
import { OVERVIEW_META_COLUMNS } from '../../utils/modelScheduleOverviewRows'

export default function ModelStatusMetaCard({ model }: { model: OverviewModel }) {
  return (
    <div className="border border-surface-border rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">모델 정보 (A~H)</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-border">
        {OVERVIEW_META_COLUMNS.map((col) => {
          const raw = String(model[col.key as keyof OverviewModel] ?? '').trim()
          const value = raw || '-'
          return (
            <div key={col.key} className="bg-white px-3 py-2.5 min-h-[52px]">
              <p className="text-[10px] font-semibold text-gray-400 mb-0.5">{col.label}</p>
              {col.key === 'spec' ? (
                <MetaTooltipCell value={value} className="text-[11px] text-gray-800 line-clamp-2" />
              ) : (
                <p className="text-[11px] font-medium text-gray-800 break-words">{value}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
