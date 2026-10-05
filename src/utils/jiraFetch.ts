import axios from 'axios'
import { USE_MOCK } from '../config/dataSource'

type DegradedListener = (degraded: boolean) => void

const listeners = new Set<DegradedListener>()
let jiraDegraded = false

export function isJiraDegraded(): boolean {
  return jiraDegraded
}

export function subscribeJiraDegraded(listener: DegradedListener): () => void {
  listeners.add(listener)
  listener(jiraDegraded)
  return () => listeners.delete(listener)
}

function setJiraDegraded(value: boolean) {
  if (jiraDegraded === value) return
  jiraDegraded = value
  listeners.forEach((fn) => fn(value))
}

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
