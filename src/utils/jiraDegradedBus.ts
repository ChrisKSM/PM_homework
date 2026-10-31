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

/** jiraFetch에서 BE 장애 시만 호출 */
export function setJiraDegraded(value: boolean) {
  if (jiraDegraded === value) return
  jiraDegraded = value
  listeners.forEach((fn) => fn(value))
}
