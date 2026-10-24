import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import { modelStatusApi } from '../../api/modelStatusApi'

export interface ModelStatusPrdPanelProps {
  modelCode: string
  active?: boolean
}

export default function ModelStatusPrdPanel({ modelCode, active = true }: ModelStatusPrdPanelProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['model-status-prd', modelCode],
    queryFn: () => modelStatusApi.getPrd(modelCode, true),
    enabled: active && Boolean(modelCode),
    staleTime: 60_000,
  })

  if (!active) return null

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
        <Loader2 size={16} className="animate-spin" />
        ALM PRD 조회 중…
      </div>
    )
  }

  if (isError) {
    const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '조회 실패'
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold mb-1">PRD ALM 조회 실패</p>
        <p className="text-xs">{msg}</p>
        <button type="button" className="mt-2 text-xs underline" onClick={() => refetch()}>
          다시 시도
        </button>
      </div>
    )
  }

  const meta = data?.meta
  const items = data?.items ?? []
  const probe = data?.probe ?? []
  const discovery = data?.discovery
  const sampleAnalysis = discovery?.sampleAnalysis

  return (
    <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">PRD (ALM)</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            적용모델: {meta?.terms?.join(' · ') || modelCode} · source={meta?.source}{' '}
            {meta?.winningQuery ? `· query=${meta.winningQuery.slice(0, 80)}…` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-white disabled:opacity-50"
        >
          {isFetching ? '조회 중…' : '다시 가져오기'}
        </button>
      </div>

      {!meta?.polarionConfigured && !meta?.davisConfigured && (
        <p className="text-xs text-amber-800 bg-amber-50 px-4 py-2 border-b border-amber-100">
          POLARION_PAT 또는 DAVIS_DB_API_BASE_URL + DAVIS_DB_API_KEY 가 BE .env에 필요합니다.
        </p>
      )}

      {discovery && (
        <div className="px-4 py-2 border-b text-[10px] text-gray-600 bg-slate-50">
          <p className="font-medium text-gray-700">Discovery — hit {discovery.hits ?? 0}</p>
          {sampleAnalysis?.applyFieldHints?.length ? (
            <ul className="mt-1 space-y-0.5">
              {sampleAnalysis.applyFieldHints.map((h) => (
                <li key={h.field}>
                  <span className="font-mono text-emerald-800">{h.field}</span>: {h.samples?.join(' · ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">type/필드 hit 없음 — Polarion PRD 프로젝트 키(POLARION_PRD_PROJECT_KEY) 확인</p>
          )}
          {sampleAnalysis?.typesSeen && (
            <p className="mt-1 text-gray-500">types: {JSON.stringify(sampleAnalysis.typesSeen)}</p>
          )}
        </div>
      )}

      {probe.length > 0 && (
        <details className="px-4 py-2 border-b text-[10px] text-gray-600">
          <summary className="cursor-pointer font-medium">Probe ({probe.filter((p) => p.count > 0).length} hits)</summary>
          <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 font-mono">
            {probe.map((p) => (
              <li key={p.query} className={p.count > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                {p.count} — {p.query}
                {p.error ? ` (${p.error})` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">PRD workitem 0건 — probe에서 hit 쿼리/필드명 확인</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">적용모델</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.polarionUrl ? (
                      <a
                        href={row.polarionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {row.id}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      row.id
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-md truncate" title={row.title}>
                    {row.title}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.applyModel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
