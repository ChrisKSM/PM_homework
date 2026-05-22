import axios from 'axios'

const PROD_API_BASE_URL = 'https://be-audio-test.apps.hedej.lge.com/api'

function resolveApiBaseUrl(): string {
  const env = (window as any).workspace_env ?? {}

  // prod FE — BE 직접 호출
  if (
    window.location.hostname === 'react-audio.apps.hedej.lge.com' ||
    (window.location.hostname.endsWith('.apps.hedej.lge.com') &&
      !window.location.hostname.includes('be-audio-test'))
  ) {
    return PROD_API_BASE_URL
  }

  if (env.REACT_APP_API_BASE_URL) return env.REACT_APP_API_BASE_URL
  if (process.env.REACT_APP_API_BASE_URL) return process.env.REACT_APP_API_BASE_URL

  if (window.location.hostname.includes('workspace')) {
    const m = window.location.pathname.match(/(\/project\/[^/]+\/[^/]+\/proxy\/)\d+/)
    if (m) return `${window.location.origin}${m[1]}8000/api`
  }

  return 'http://localhost:8000/api'
}

const client = axios.create({
  baseURL: resolveApiBaseUrl(),   // ← 이 줄이 핵심
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export default client