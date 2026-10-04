import axios from 'axios'

const BE_AXSTUDIO = 'https://be-audio-test.apps.axstudio.lge.com/api'
const BE_HEDEJ = 'https://be-audio-test.apps.hedej.lge.com/api'

function isFeHost(host: string, domain: 'axstudio' | 'hedej'): boolean {
  const suffix = `.apps.${domain}.lge.com`
  return host.endsWith(suffix) && !host.includes('be-audio-test')
}

function resolveApiBaseUrl(): string {
  const env = (window as any).workspace_env ?? {}
  const host = window.location.hostname

  // AX Studio runtime 주입 (최우선)
  if (env.REACT_APP__API_BASE_URL) return env.REACT_APP__API_BASE_URL

  // 배포 FE hostname → 같은 realm BE ( .env hedej 고정값보다 우선 )
  if (host === 'react-audio.apps.axstudio.lge.com' || isFeHost(host, 'axstudio')) {
    return BE_AXSTUDIO
  }
  if (host === 'react-audio.apps.hedej.lge.com' || isFeHost(host, 'hedej')) {
    return BE_HEDEJ
  }

  if (env.REACT_APP_API_BASE_URL) return env.REACT_APP_API_BASE_URL
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL

  if (host.includes('workspace')) {
    const m = window.location.pathname.match(/(\/project\/[^/]+\/[^/]+\/proxy\/)\d+/)
    if (m) return `${window.location.origin}${m[1]}8000/api`
    // workspace pod — axstudio BE 기본 (회사 react-audio 표준)
    return BE_AXSTUDIO
  }

  return 'http://localhost:8000/api'
}

const client = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
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
