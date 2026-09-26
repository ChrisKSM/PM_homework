/** Polarion Lucene query 조합 — backend/polarion_client.build_query 와 동일. */

function quotePolarionValue(value: string): string {
  if (/^[A-Za-z0-9_.\-]+$/.test(value)) return value
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function toPolarionDate(value: string): string {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length >= 8 ? digits.slice(0, 8) : ''
}

export function normalizeProjectNames(names: string[] | string | undefined): string[] {
  const items = Array.isArray(names) ? names : names ? [names] : []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const name = (item || '').trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      result.push(name)
    }
  }
  return result
}

export interface PolarionQueryInput {
  projectNames?: string[] | string
  eventSequence?: string
  modelName?: string
  createdFrom?: string
  createdTo?: string
}

export function buildPolarionQuery(input: PolarionQueryInput): string {
  const parts: string[] = []

  const fromD = toPolarionDate(input.createdFrom || '')
  const toD = toPolarionDate(input.createdTo || '')
  if (fromD && toD) parts.push(`created:[${fromD} TO ${toD}]`)
  else if (fromD) parts.push(`created:[${fromD} TO *]`)
  else if (toD) parts.push(`created:[* TO ${toD}]`)

  const seq = (input.eventSequence || '').trim()
  if (seq && seq.toUpperCase() !== 'ALL') {
    parts.push(`eventSequence.KEY:${seq}`)
  }

  const names = normalizeProjectNames(input.projectNames)
  if (names.length) {
    const clauses = names.map((name) => `project_name:${quotePolarionValue(name)}`)
    parts.push(clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`)
  }

  if (input.modelName) {
    parts.push(`model_name:${quotePolarionValue(input.modelName)}`)
  }

  return parts.length ? parts.join(' AND ') : 'type:testDefect'
}
