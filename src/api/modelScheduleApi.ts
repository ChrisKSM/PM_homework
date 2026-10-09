import client from './client'
import { prepareModelScheduleRows } from '../utils/modelScheduleRows'

const STORAGE_KEY = 'model-schedule-data'
const OVERVIEW_STORAGE_KEY = 'model-schedule-overview-data'

function normalizeOverviewModel(raw: any): any | null {
  if (!raw || typeof raw !== 'object') return null
  const model = String(raw.model ?? raw.model_name ?? '').trim()
  if (!model) return null
  const events = Array.isArray(raw.events) ? raw.events : []
  return {
    id: String(raw.id ?? raw.row_id ?? model),
    category: raw.category ?? raw.product_group ?? '',
    model,
    variant: raw.variant ?? raw.dev_grade ?? '',
    manufacturer: raw.manufacturer ?? raw.production ?? '',
    soc: raw.soc ?? '',
    hwPm: raw.hwPm ?? raw.hw_pm ?? '',
    swPo: raw.swPo ?? raw.sw_po ?? '',
    swPm: raw.swPm ?? raw.sw_pm ?? '',
    spec: raw.spec ?? '',
    pv: raw.pv ?? '',
    mp: raw.mp ?? '',
    ats: raw.ats ?? '',
    events: events
      .filter((e: any) => {
        const name = String(e?.name ?? e?.event ?? '').trim()
        const start = String(e?.start ?? '').trim()
        return name && name !== '-' && start && start !== '-'
      })
      .map((e: any) => ({
        name: String(e.name ?? e.event ?? '').trim(),
        start: String(e.start ?? '').slice(0, 10),
        end: String(e.end ?? e.start ?? '').slice(0, 10),
        barType: e.barType,
        kind: e.kind,
      })),
  }
}

function normalizeOverviewModels(raw: any[] | null | undefined): any[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeOverviewModel).filter(Boolean) as any[]
}

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

  loadOverview: async (): Promise<{ models: any[]; count: number; source: 'mongo' | 'local' | 'default' }> => {
    try {
      const res = await client
        .get<{ models: any[]; count: number }>('/model-schedule/overview/load')
        .then((r) => r.data)
      const models = normalizeOverviewModels(res.models)
      if (models.length > 0) {
        localStorage.setItem(OVERVIEW_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), models }))
        return { models, count: models.length, source: 'mongo' }
      }
    } catch (e) {
      console.warn('overview load failed, trying localStorage:', e)
    }
    try {
      const raw = localStorage.getItem(OVERVIEW_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const models = normalizeOverviewModels(parsed?.models ?? parsed)
        if (models.length > 0) {
          return { models, count: models.length, source: 'local' }
        }
      }
    } catch {
      /* ignore */
    }
    return { models: [], count: 0, source: 'default' }
  },

  saveOverview: async (models: any[]): Promise<{ saved: number; message: string; source: 'mongo' | 'local' }> => {
    try {
      const res = await client
        .post<{ saved: number; message: string }>('/model-schedule/overview/save', { models })
        .then((r) => r.data)
      localStorage.setItem(OVERVIEW_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), models }))
      return { ...res, source: 'mongo' }
    } catch (e: any) {
      localStorage.setItem(OVERVIEW_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), models }))
      const detail = e?.response?.data?.detail || e?.message || 'unknown'
      return {
        saved: models.length,
        message: `브라우저에 저장됨 (서버 저장 실패: ${detail})`,
        source: 'local',
      }
    }
  },

  shareSnapshot: async (payload: {
    period_label: string
    dates: string[]
    rows: any[]
    audiences: string[]
    recipients?: string[]
    schedule_changes?: Array<{ model: string; test_type: string; before: string; after: string }>
    month_schedule_summary?: Array<{ model: string; schedule: string }>
  }): Promise<{ message: string; subject: string; recipients: string[] }> => {
    const res = await client
      .post<{ message: string; subject: string; recipients: string[] }>(
        '/model-schedule/share',
        payload,
      )
      .then((r) => r.data)
    return res
  },

  shareOverviewSnapshot: async (payload: {
    period_label: string
    dates: string[]
    models: any[]
    display_rows: any[]
    page_images?: Array<{ page: number; data: string }>
    audiences: string[]
    recipients?: string[]
  }): Promise<{ message: string; subject: string; recipients: string[] }> => {
    const res = await client
      .post<{ message: string; subject: string; recipients: string[] }>(
        '/model-schedule/overview/share',
        payload,
      )
      .then((r) => r.data)
    return res
  },
}
