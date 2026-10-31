import { useQuery } from '@tanstack/react-query'
import { modelStatusApi } from '../api/modelStatusApi'

/** PRD 탭 마운트 시 fetch (Initiative/Release 와 동일 — hidden+enabled=false 는 Network 미발생). */
export function useModelStatusPrd(modelCode: string) {
  const code = (modelCode || '').trim()
  return useQuery({
    queryKey: ['model-status-prd', code],
    queryFn: () => modelStatusApi.getPrd(code, false),
    enabled: Boolean(code),
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: 'always',
  })
}
