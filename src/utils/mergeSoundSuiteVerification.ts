import type { ModelRow } from './modelScheduleRows'
import { prepareModelScheduleRows } from './modelScheduleRows'

const SUITE_MODELS = ['H7_VI', 'H5', 'M7_VI', 'M5_VI', 'W5', 'H7 MR10(11월)', 'M7/W7 MR9(11월)']

export function soundSuiteMissing(rows: ModelRow[]): boolean {
  return !rows.some((r) => r.model === 'H7_VI')
}

/** Mongo seed 가 구버전(56행)일 때 Sound Suite(H7_VI 등) 보충 */
export async function mergeSoundSuiteSupplement(rows: ModelRow[]): Promise<{
  rows: ModelRow[]
  merged: boolean
  added: number
}> {
  if (!soundSuiteMissing(rows)) {
    return { rows, merged: false, added: 0 }
  }

  try {
    const res = await fetch(`/model-schedule-sound-suite-supplement.json?_=${Date.now()}`)
    if (!res.ok) return { rows, merged: false, added: 0 }
    const payload = (await res.json()) as { rows?: unknown[] }
    const extra = Array.isArray(payload?.rows) ? payload.rows : []
    if (!extra.length) return { rows, merged: false, added: 0 }

    const have = new Set(rows.map((r) => r.id))
    const toAdd = extra.filter((r) => {
      const id = String((r as ModelRow).id ?? '')
      return id && !have.has(id)
    })
    if (!toAdd.length) return { rows, merged: false, added: 0 }

    const mergedRows = prepareModelScheduleRows([...rows, ...toAdd])
    return { rows: mergedRows, merged: true, added: toAdd.length }
  } catch {
    return { rows, merged: false, added: 0 }
  }
}

export function soundSuiteModelHint(): string {
  return SUITE_MODELS.join(', ')
}
