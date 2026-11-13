import axios from 'axios'
import { USE_MOCK } from '../config/dataSource'
import { setJiraDegraded } from './jiraDegradedBus'

export { isJiraDegraded, subscribeJiraDegraded } from './jiraDegradedBus'

function isGatewayError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 502 || status === 503 || status === 504
}

/** BE Jira 502/503/504 시 mock 데이터로 폴백 (대시보드 빈 화면 방지) */
export async function jiraFetchOrMock<T>(apiFn: () => Promise<T>, mock: T): Promise<T> {
  if (USE_MOCK) return mock
  try {
    return await apiFn()
  } catch (error) {
    if (isGatewayError(error)) {
      setJiraDegraded(true)
      console.warn('[Jira] BE unavailable — showing mock fallback', error)
      return mock
    }
    throw error
  }
}
