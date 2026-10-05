import { useMemo, useState } from 'react'
import clsx from 'clsx'
import Header from '../components/layout/Header'
import ManagerDashboardBody from '../components/modelStatus/ManagerDashboardBody'
import { OVERVIEW_MOCK_MODELS } from '../data/modelScheduleOverviewMock'
import { prepareOverviewModels } from '../utils/modelScheduleOverviewRows'

export default function ModelScheduleStatusPage() {
  const models = useMemo(() => prepareOverviewModels(OVERVIEW_MOCK_MODELS), [])
  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        id: m.id,
        label: m.model,
        category: m.category,
      })),
    [models],
  )
  const [selectedId, setSelectedId] = useState(modelOptions[0]?.id ?? '')

  const selected = modelOptions.find((m) => m.id === selectedId)

  return (
    <>
      <Header
        title="모델현황(준비 중)"
        subtitle={
          selected
            ? `${selected.category} · ${selected.label} — S80C 조직 책임자 대시보드 UI 템플릿`
            : '모델을 선택하세요'
        }
      />

      <div className="pt-16 p-6 space-y-4">
        <div className="border border-surface-border rounded-xl bg-white p-3">
          <p className="text-[11px] font-semibold text-gray-600 mb-2">모델 선택</p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {modelOptions.map((m) => (
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
                {m.label}
              </button>
            ))}
          </div>
          {selected && (
            <p className="text-[10px] text-gray-400 mt-2">
              선택: {selected.category} / {selected.label} · 데이터 연동 전 — UI 레이아웃 미리보기
            </p>
          )}
        </div>

        <ManagerDashboardBody />
      </div>
    </>
  )
}
