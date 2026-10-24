import { useQuery } from '@tanstack/react-query'
import { modelStatusApi } from '../api/modelStatusApi'

export function useModelStatusPrd(modelCode: string, enabled: boolean) {
  const code = (modelCode || '').trim()
  return useQuery({
    queryKey: ['model-status-prd', code],
    queryFn: () => modelStatusApi.getPrd(code, false),
    enabled: enabled && Boolean(code),
    staleTime: 60_000,
    retry: 1,
  })
}
