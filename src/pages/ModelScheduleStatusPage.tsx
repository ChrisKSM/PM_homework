import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Header from '../components/layout/Header'
import ModelIntegratedDashboard from '../components/modelStatus/ModelIntegratedDashboard'
import { modelScheduleApi } from '../api/modelScheduleApi'
import { OVERVIEW_MOCK_MODELS } from '../data/modelScheduleOverviewMock'
import {
  MODEL_STATUS_PRODUCT_GROUPS,
  type ModelStatusProductGroupId,
  type ModelStatusTabId,
} from '../data/modelStatusCatalog'
import type { OverviewModel } from '../types/modelScheduleOverview'
import type { ModelRow } from '../utils/modelScheduleRows'
import { prepareOverviewModels } from '../utils/modelScheduleOverviewRows'

export default function ModelScheduleStatusPage() {
  const [overviewModels, setOverviewModels] = useState<OverviewModel[]>(() =>
    prepareOverviewModels(OVERVIEW_MOCK_MODELS),
  )
  const [verificationRows, setVerificationRows] = useState<ModelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'mongo' | 'local' | 'mock'>('mock')

  const [productGroupId, setProductGroupId] = useState<ModelStatusProductGroupId>('sound-suite')
  const [modelCode, setModelCode] = useState('H7_VI')
  const [tab, setTab] = useState<ModelStatusTabId>('summary')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([modelScheduleApi.loadOverview(), modelScheduleApi.load()])
      .then(([ov, ver]) => {
        if (cancelled) return
        if (ov.models.length > 0) {
          setOverviewModels(prepareOverviewModels(ov.models as OverviewModel[]))
          setDataSource(ov.source === 'default' ? 'mock' : ov.source)
        } else {
          setOverviewModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
          setDataSource('mock')
        }
        setVerificationRows(ver.rows as ModelRow[])
      })
      .catch(() => {
        if (cancelled) return
        setOverviewModels(prepareOverviewModels(OVERVIEW_MOCK_MODELS))
        setDataSource('mock')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const group = useMemo(
    () => MODEL_STATUS_PRODUCT_GROUPS.find((g) => g.id === productGroupId)!,
    [productGroupId],
  )

  useEffect(() => {
    const list = group.models.length
      ? group.models
      : overviewModels.filter((m) => m.category.includes(group.label)).map((m) => m.model)
    if (list.length && !list.includes(modelCode)) {
      setModelCode(list[0])
    }
  }, [group, modelCode, overviewModels])

  const handleProductGroupChange = (id: ModelStatusProductGroupId) => {
    setProductGroupId(id)
    const g = MODEL_STATUS_PRODUCT_GROUPS.find((x) => x.id === id)!
    if (g.models[0]) setModelCode(g.models[0])
  }

  return (
    <>
      <Header
        title="모델현황"
        subtitle={`${group.label} · ${modelCode.replace(/_/g, ' ')} · overview ${dataSource} · 검증 ${verificationRows.length}행`}
      />

      <div className="pt-16 p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            overview · 검증 일정 로드 중…
          </div>
        ) : (
          <ModelIntegratedDashboard
            overviewModels={overviewModels}
            verificationRows={verificationRows}
            productGroupId={productGroupId}
            modelCode={modelCode}
            tab={tab}
            onProductGroupChange={handleProductGroupChange}
            onModelChange={setModelCode}
            onTabChange={setTab}
          />
        )}
      </div>
    </>
  )
}
