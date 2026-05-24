/** 회사 GitLab: REACT_APP__USE_MOCK (언더스코어 2개) / GitHub: REACT_APP_USE_MOCK */
function readMockEnv(): string | undefined {
  const workspaceEnv = (window as any).workspace_env ?? {}
  return (
    workspaceEnv.REACT_APP_USE_MOCK ??
    workspaceEnv.REACT_APP__USE_MOCK ??
    process.env.REACT_APP_USE_MOCK ??
    process.env.REACT_APP__USE_MOCK
  )
}

/** 대시보드·planning 공통 mock/API 분기 */
export function resolveUseMock(): boolean {
  const mockEnv = readMockEnv()

  if (mockEnv === 'false') return false
  if (mockEnv === 'true') return true

  // prod FE — env 미설정 시 API 우선
  if (
    window.location.hostname === 'react-audio.apps.hedej.lge.com' ||
    (window.location.hostname.endsWith('.apps.hedej.lge.com') &&
      !window.location.hostname.includes('be-audio-test'))
  ) {
    return false
  }

  // 로컬/workspace dev 기본 mock
  return true
}

export const USE_MOCK = resolveUseMock()
