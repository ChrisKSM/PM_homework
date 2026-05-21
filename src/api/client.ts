import axios from 'axios'

const PROD_API_BASE_URL = 'https://be-audio-test.apps.hedej.lge.com/api'
const workspaceEnv = (window as any).workspace_env ?? {}

function resolveBaseURL(): string {
  if (
    window.location.hostname === 'react-audio.apps.hedej.lge.com' ||
    (window.location.hostname.endsWith('.apps.hedej.lge.com') &&
      !window.location.hostname.includes('be-audio-test'))
  ) {
    return PROD_API_BASE_URL
  }

  if (workspaceEnv.REACT_APP_API_BASE_URL) {
    return workspaceEnv.REACT_APP_API_BASE_URL
  }
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL
  }
  if (window.location.hostname.includes('workspace')) {
    const match = window.location.pathname.match(
      /(\/project\/[^/]+\/[^/]+\/proxy\/)\d+/
    )
    if (match) {
      return `${window.location.origin}${match[1]}8000/api`
    }
  }
  return 'http://localhost:8000/api'
}

const client = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 10000,
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