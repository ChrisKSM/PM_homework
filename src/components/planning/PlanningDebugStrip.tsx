import client from '../../api/client'
import { USE_MOCK } from '../../config/dataSource'

interface Props {
  complianceMeta?: {
    totalStories: number
    linkedStories: number
    sprintCount: number
  }
  apiError?: boolean
}

export default function PlanningDebugStrip({ complianceMeta, apiError }: Props) {
  const apiBase = (client.defaults.baseURL as string) ?? '—'

  return (
    <div className="rounded-lg border border-dashed border-surface-border bg-surface-page px-4 py-3 text-xs text-gray-600 space-y-1">
      <p className="font-bold text-gray-800">Planning 디버그</p>
      <p>
        데이터 소스:{' '}
        <span className={USE_MOCK ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
          {USE_MOCK ? 'Mock (REACT_APP_USE_MOCK / REACT_APP__USE_MOCK)' : 'Jira API'}
        </span>
      </p>
      <p>
        API baseURL: <code className="text-gray-800">{apiBase}</code>
      </p>
      {!USE_MOCK && complianceMeta && (
        <p>
          Jira 집계 — Story {complianceMeta.totalStories}개 · Epic+Sprint 연결 {complianceMeta.linkedStories}개 ·
          Sprint {complianceMeta.sprintCount}개
        </p>
      )}
      {apiError && (
        <p className="text-lg-red font-semibold">
          /api/planning/compliance 호출 실패 — BE에 planning router 등록 및 Pod 재시작 확인
        </p>
      )}
      <p className="text-gray-400">
        Mock KPI 참고값: 계층 68% / AC 52% / Sprint Goal 100% — 이 숫자면 API 미연동
      </p>
    </div>
  )
}
