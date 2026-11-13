import axios from 'axios'

/** 팀 공용 BE Route — react-audio FE 기본 (노트북 Worker Port 아님) */
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

/** AxStudio 개인 Worker Port — 세션/노트북 종료 시 503 */
export function isWorkerPortBeUrl(url: string | undefined): boolean {
  if (!url) return false
  return /--\d+--/i.test(url) && url.includes('be-audio-test')
}

function allowWorkerBeOverride(): boolean {
  const env = (window as any).workspace_env ?? {}
  const flag =
    env.REACT_APP_ALLOW_WORKER_BE ??
    env.REACT_APP__ALLOW_WORKER_BE ??
    process.env.REACT_APP_ALLOW_WORKER_BE
  return String(flag).toLowerCase() === 'true'
}

function readApiBaseUrlOverride(): string | undefined {
  const env = (window as any).workspace_env ?? {}
  return (
    env.REACT_APP__API_BASE_URL ??
    env.REACT_APP_API_BASE_URL ??
    process.env.REACT_APP_API_BASE_URL
  )
}

function sanitizeOverride(url: string | undefined, host: string): string | undefined {
  if (!url?.trim()) return undefined
  const trimmed = url.trim()
  if (REACT_AUDIO_HOSTS.has(host) && isWorkerPortBeUrl(trimmed) && !allowWorkerBeOverride()) {
    console.warn(
      '[api] Worker BE URL ignored on shared react-audio — using',
      BE_AXSTUDIO,
      '(set REACT_APP_ALLOW_WORKER_BE=true to force Worker)',
    )
    return undefined
  }
  if (isWorkerPortBeUrl(trimmed) && !allowWorkerBeOverride() && host.includes('workspace')) {
    console.warn('[api] Worker BE URL ignored on workspace — using', BE_AXSTUDIO)
    return undefined
  }
  return trimmed
}

export function resolveApiBaseUrl(): string {
  const host = window.location.hostname

  // 공용 react-audio — 항상 공용 Route (503 Worker Port 방지)
  if (host === 'react-audio.apps.axstudio.lge.com') {
    return BE_AXSTUDIO
  }
  if (REACT_AUDIO_HOSTS.has(host)) {
    return BE_AXSTUDIO
  }

  const override = sanitizeOverride(readApiBaseUrlOverride(), host)
  if (override) return override

  if (isFeHost(host, 'axstudio')) {
    return BE_AXSTUDIO
  }
  if (isFeHost(host, 'hedej')) {
    return BE_HEDEJ
  }

  if (host.includes('workspace')) {
    const allowWorker = allowWorkerBeOverride()
    const m = window.location.pathname.match(/(\/project\/[^/]+\/[^/]+\/proxy\/)\d+/)
    if (allowWorker && m) {
      return `${window.location.origin}${m[1]}8000/api`
    }
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
