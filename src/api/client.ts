import axios from 'axios'

export const BE_AXSTUDIO = 'https://be-audio-test.apps.axstudio.lge.com/api'
export const BE_HEDEJ = 'https://be-audio-test.apps.hedej.lge.com/api'

/** react-audio FE — hedej/axstudio URL 모두 axstudio BE (회사 표준) */
const REACT_AUDIO_HOSTS = new Set([
  'react-audio.apps.axstudio.lge.com',
  'react-audio.apps.hedej.lge.com',
])

function isFeHost(host: string, domain: 'axstudio' | 'hedej'): boolean {
  const suffix = `.apps.${domain}.lge.com`
  return host.endsWith(suffix) && !host.includes('be-audio-test')
}

export function resolveApiBaseUrl(): string {
  const env = (window as any).workspace_env ?? {}
  const host = window.location.hostname

  // react-audio — entrypoint hedej 주입·.env hedej 보다 우선
  if (REACT_AUDIO_HOSTS.has(host)) {
    return BE_AXSTUDIO
  }

  if (isFeHost(host, 'axstudio')) {
    return BE_AXSTUDIO
  }
  if (isFeHost(host, 'hedej')) {
    return BE_HEDEJ
  }

  if (env.REACT_APP__API_BASE_URL) return env.REACT_APP__API_BASE_URL
  if (env.REACT_APP_API_BASE_URL) return env.REACT_APP_API_BASE_URL
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL

  if (host.includes('workspace')) {
    const m = window.location.pathname.match(/(\/project\/[^/]+\/[^/]+\/proxy\/)\d+/)
    if (m) return `${window.location.origin}${m[1]}8000/api`
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
  },
)

export default client
