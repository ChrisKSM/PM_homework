/** 릴리즈 Gantt — Mock 우선 (Delivery Portal PAT·BE 연동 전 UI 확인) */
export function useDeliveryPortalMockData(): boolean {
  const workspaceEnv = (window as typeof window & { workspace_env?: Record<string, string> }).workspace_env ?? {}
  const raw =
    workspaceEnv.REACT_APP_DELIVERY_PORTAL_MOCK ??
    process.env.REACT_APP_DELIVERY_PORTAL_MOCK ??
    'true'
  if (raw === 'false') return false
  if (raw === 'true') return true
  return true
}
