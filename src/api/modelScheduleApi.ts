import client from './client'

const STORAGE_KEY = 'model-schedule-data'

export type ModelScheduleLoadResult = {
  rows: any[]
  count: number
  source: 'mongo' | 'local' | 'default'
}

function loadLocal(): any[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function saveLocal(rows: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch (e) {
    console.warn('localStorage save failed:', e)
  }
}

export const modelScheduleApi = {
  load: async (): Promise<ModelScheduleLoadResult> => {
    try {
      const res = await client
        .get<{ rows: any[]; count: number }>('/model-schedule/load')
        .then((r) => r.data)

      if (res.rows?.length > 0) {
        saveLocal(res.rows)
        return { rows: res.rows, count: res.count, source: 'mongo' }
      }
    } catch (e) {
      console.warn('MongoDB load failed, trying localStorage:', e)
    }

    const local = loadLocal()
    if (local?.length) {
      return { rows: local, count: local.length, source: 'local' }
    }

    return { rows: [], count: 0, source: 'default' }
  },

  save: async (rows: any[]): Promise<{ saved: number; message: string; source: 'mongo' | 'local' }> => {
    saveLocal(rows)

    try {
      const res = await client
        .post<{ saved: number; message: string }>('/model-schedule/save', { rows })
        .then((r) => r.data)
      return { ...res, source: 'mongo' }
    } catch (e) {
      console.warn('MongoDB save failed, data kept in localStorage:', e)
      return { saved: rows.length, message: '브라우저에 저장됨 (서버 저장 실패)', source: 'local' }
    }
  },

  loadLocal,
}
