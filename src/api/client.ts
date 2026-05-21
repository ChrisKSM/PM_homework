import axios from 'axios'

/** K8s prod: FE react-audio → BE be-audio-test */
const PROD_API_BASE_URL = 'https://be-audio-test.apps.hedej.lge.com/api'

function isProdFeHost(): boolean {
  return (
    window.location.hostname.endsWith('.apps.hedej.lge.com') &&
    !window.location.hostname.includes('be-audio-test')
  )
}

/** CI BUILD_ARGS 등에 박힌 workspace dev proxy URL — prod FE에서는 사용 금지 */
function isWorkspaceProxyUrl(url: string): boolean {
  return url.includes('workspace.hedej.lge.com') && url.includes('/proxy/')
}

function resolveApiBaseUrl(): string {
  const workspaceEnv = (window as any).workspace_env ?? {}

  // 1) K8s prod FE — hostname 우선 (빌드 bake-in workspace URL 무시)
  if (isProdFeHost()) {
    const runtimeUrl = workspaceEnv.REACT_APP_API_BASE_URL as string | undefined
    if (runtimeUrl && !isWorkspaceProxyUrl(runtimeUrl)) {
      return runtimeUrl
    }
    return PROD_API_BASE_URL
  }

  // 2) workspace dev — entrypoint / build env
  if (workspaceEnv.REACT_APP_API_BASE_URL) {
    return workspaceEnv.REACT_APP_API_BASE_URL
  }
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL
  }

  // 3) workspace dev — proxy 경로에서 BE 자동 유도
  if (window.location.hostname.includes('workspace')) {
    const match = window.location.pathname.match(
      /(\/project\/[^/]+\/[^/]+\/proxy\/)\d+/
    )
    if (match) {
      return `${window.location.origin}${match[1]}8000/api`
    }
  }

  // 4) 로컬
  return 'http://localhost:8000/api'
}

const client = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized — Jira API 인증이 필요합니다.')
    }
    return Promise.reject(error)
  }
)

export default client