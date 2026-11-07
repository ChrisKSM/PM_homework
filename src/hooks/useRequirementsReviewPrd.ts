import { useQuery } from '@tanstack/react-query'
import { modelStatusApi } from '../api/modelStatusApi'

export function useRequirementsReviewPrd(modelCode: string) {
  const code = (modelCode || '').trim()
  return useQuery({
    queryKey: ['requirements-review-prd', code],
    queryFn: () => modelStatusApi.getPrd(code, false),
    enabled: Boolean(code),
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: 'always',
  })
}
