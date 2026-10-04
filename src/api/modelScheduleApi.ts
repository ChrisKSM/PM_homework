import client from './client'
import { prepareModelScheduleRows } from '../utils/modelScheduleRows'

const STORAGE_KEY = 'model-schedule-data'

export type ModelScheduleLoadResult = {
  rows: any[]
  count: number
  source: 'mongo' | 'local' | 'default'
}

type StoredPayload = {
  savedAt: number
  source: 'mongo' | 'local'
  rows: any[]
}

function loadLocalPayload(): StoredPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return { savedAt: 0, source: 'local', rows: parsed }
    }
    if (parsed?.rows && Array.isArray(parsed.rows)) {
      return parsed as StoredPayload
    }
    return null
  } catch {
    return null
  }
}

function saveLocalPayload(rows: any[], source: 'mongo' | 'local'): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), source, rows } satisfies StoredPayload)
    )
  } catch (e) {
    console.warn('localStorage save failed:', e)
  }
}

export const modelScheduleApi = {
  load: async (): Promise<ModelScheduleLoadResult> => {
    const localPayload = loadLocalPayload()

    // 마지막 저장이 BE 실패(local)였으면, stale Mongo 데이터보다 local 우선
    if (localPayload?.source === 'local' && localPayload.rows.length > 0) {
      try {
        const res = await client
          .get<{ rows: any[]; count: number }>('/model-schedule/load')
          .then((r) => r.data)
        if (res.rows?.length > 0) {
          saveLocalPayload(res.rows, 'mongo')
        }
      } catch (e) {
        console.warn('MongoDB load failed, using localStorage:', e)
      }
      const rows = prepareModelScheduleRows(localPayload.rows)
      return { rows, count: rows.length, source: 'local' }
    }

    try {
      const res = await client
        .get<{ rows: any[]; count: number }>('/model-schedule/load')
        .then((r) => r.data)

      if (res.rows?.length > 0) {
        saveLocalPayload(res.rows, 'mongo')
        const rows = prepareModelScheduleRows(res.rows)
        return { rows, count: rows.length, source: 'mongo' }
      }
    } catch (e) {
      console.warn('MongoDB load failed, trying localStorage:', e)
    }

    if (localPayload?.rows.length) {
      const rows = prepareModelScheduleRows(localPayload.rows)
      return { rows, count: rows.length, source: 'local' }
    }

    return { rows: [], count: 0, source: 'default' }
  },

  save: async (rows: any[]): Promise<{ saved: number; message: string; source: 'mongo' | 'local' }> => {
    const prepared = prepareModelScheduleRows(rows)
    try {
      const res = await client
        .post<{ saved: number; message: string }>('/model-schedule/save', { rows: prepared })
        .then((r) => r.data)
      saveLocalPayload(prepared, 'mongo')
      return { ...res, source: 'mongo' }
    } catch (e: any) {
      saveLocalPayload(prepared, 'local')
      const detail = e?.response?.data?.detail || e?.message || 'unknown'
      console.warn('MongoDB save failed, data kept in localStorage:', detail, e)
      return {
        saved: prepared.length,
        message: `브라우저에 저장됨 (서버 저장 실패: ${detail})`,
        source: 'local',
      }
    }
  },

  loadLocal: () => loadLocalPayload()?.rows ?? null,

  shareSnapshot: async (payload: {
    period_label: string
    dates: string[]
    rows: any[]
    audiences: string[]
    recipients?: string[]
  }): Promise<{ message: string; subject: string; recipients: string[] }> => {
    const res = await client
      .post<{ message: string; subject: string; recipients: string[] }>(
        '/model-schedule/share',
        payload,
      )
      .then((r) => r.data)
    return res
  },
}
