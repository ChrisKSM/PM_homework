import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { modelStatusApi } from '../api/modelStatusApi'
import type { RequirementsReviewPlan, RequirementsReviewPlanInput } from '../types/requirementsReview'
import { readLocalPlans, writeLocalPlan } from '../utils/requirementsReviewPlan'

export type PlanStoreSource = 'server' | 'local'

interface PlansState {
  items: RequirementsReviewPlan[]
  source: PlanStoreSource
  error?: string
}

const QUERY_KEY = ['requirements-review-plans']

/** BE 미배포(404) · Milvus 장애(503) · 네트워크 오류 — 브라우저 임시 저장으로 대체 */
function shouldFallbackToLocal(err: unknown): boolean {
  if (!isAxiosError(err)) return false
  const status = err.response?.status
  return status === undefined || status === 404 || status === 502 || status === 503
}

function errorText(err: unknown): string {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail
    return typeof detail === 'string' ? detail : err.message
  }
  return err instanceof Error ? err.message : String(err)
}

export function useRequirementsReviewPlans() {
  const queryClient = useQueryClient()

  const query = useQuery<PlansState>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await modelStatusApi.getRequirementsReviewPlans()
        return { items: res.items ?? [], source: 'server' }
      } catch (err) {
        if (!shouldFallbackToLocal(err)) throw err
        return { items: readLocalPlans(), source: 'local', error: errorText(err) }
      }
    },
    staleTime: 30_000,
    retry: 0,
  })

  const mutation = useMutation({
    mutationFn: async (input: RequirementsReviewPlanInput): Promise<PlansState> => {
      const prev = queryClient.getQueryData<PlansState>(QUERY_KEY)
      if (prev?.source !== 'local') {
        try {
          const { plan } = await modelStatusApi.saveRequirementsReviewPlan(input)
          const items = [...(prev?.items ?? []).filter((p) => p.prdId !== plan.prdId), plan]
          return { items, source: 'server' }
        } catch (err) {
          if (!shouldFallbackToLocal(err)) throw new Error(errorText(err))
        }
      }
      const items = writeLocalPlan({ ...input, updatedAt: new Date().toISOString() })
      return { items, source: 'local', error: prev?.error }
    },
    onSuccess: (next) => queryClient.setQueryData(QUERY_KEY, next),
  })

  const byId = useMemo(() => {
    const map: Record<string, RequirementsReviewPlan> = {}
    for (const p of query.data?.items ?? []) map[p.prdId] = p
    return map
  }, [query.data?.items])

  return {
    plansById: byId,
    source: query.data?.source ?? 'server',
    loadError: query.data?.error ?? (query.error ? errorText(query.error) : undefined),
    isLoading: query.isPending,
    savePlan: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
