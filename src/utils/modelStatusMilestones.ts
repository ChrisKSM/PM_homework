import type { OverviewModel } from '../types/modelScheduleOverview'
import type { ModelRow } from './modelScheduleRows'
import { canonicalModelName } from './modelScheduleRows'

export type MilestonePhase = 'FC' | 'PV' | 'MP'

export interface PhaseSegment {
  phase: MilestonePhase
  start: Date
  end: Date
  label: string
}

export interface MilestoneTimeline {
  segments: PhaseSegment[]
  today: Date
  activePhase: MilestonePhase | null
  todayRatio: number
}

function parseIso(s: string | undefined): Date | null {
  const t = String(s ?? '').trim().slice(0, 10)
  if (!t || t === '-' || t === 'NA') return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

function dayStart(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function eventPhase(name: string): MilestonePhase | null {
  const u = name.toUpperCase()
  if (/\bFC\b|FC\s*\d|PREPV|PRE-PV/i.test(u)) return 'FC'
  if (/\bPV\b|PREPV/i.test(u)) return 'PV'
  if (/\bMP\b/.test(u)) return 'MP'
  return null
}

/** overview + 검증 일정에서 FC / PV / MP 구간 추정 */
export function buildMilestoneTimeline(model: OverviewModel | null, verificationRows: ModelRow[]): MilestoneTimeline {
  const today = dayStart(new Date())
  const segments: PhaseSegment[] = []

  let fcStart: Date | null = null
  let fcEnd: Date | null = null
  let pvStart: Date | null = null
  let pvEnd: Date | null = null
  let mpStart: Date | null = null
  let mpEnd: Date | null = null

  if (model) {
    for (const ev of model.events ?? []) {
      const ph = eventPhase(ev.name) ?? (ev.barType === 'fc' ? 'FC' : ev.barType === 'pv' ? 'PV' : ev.barType === 'mp' ? 'MP' : null)
      if (!ph) continue
      const s = parseIso(ev.start)
      const e = parseIso(ev.end) ?? s
      if (!s) continue
      if (ph === 'FC') {
        fcStart = fcStart ? (s < fcStart ? s : fcStart) : s
        fcEnd = fcEnd ? (e > fcEnd ? e : fcEnd) : e ?? s
      }
      if (ph === 'PV') {
        pvStart = pvStart ? (s < pvStart ? s : pvStart) : s
        pvEnd = pvEnd ? (e > pvEnd ? e : pvEnd) : e ?? s
      }
      if (ph === 'MP') {
        mpStart = mpStart ? (s < mpStart ? s : mpStart) : s
        mpEnd = mpEnd ? (e > mpEnd ? e : mpEnd) : e ?? s
      }
    }
    const pv = parseIso(model.pv)
    const mp = parseIso(model.mp)
    if (pv && !pvStart) {
      pvStart = pv
      pvEnd = addDays(pv, 14)
    }
    if (mp && !mpStart) {
      mpStart = mp
      mpEnd = addDays(mp, 30)
    }
  }

  const code = model?.model ?? ''
  const vRows = verificationRows.filter((r) => canonicalModelName(r.model) === canonicalModelName(code))
  for (const r of vRows) {
    for (const b of r.bars ?? []) {
      const ph = eventPhase(b.label ?? '') ?? eventPhase(r.event)
      if (!ph) continue
      const s = parseIso(b.start)
      const e = parseIso(b.end) ?? s
      if (!s) continue
      if (ph === 'FC') {
        fcStart = fcStart ? (s < fcStart ? s : fcStart) : s
        fcEnd = fcEnd ? (e > fcEnd ? e : fcEnd) : e
      }
      if (ph === 'PV') {
        pvStart = pvStart ? (s < pvStart ? s : pvStart) : s
        pvEnd = pvEnd ? (e > pvEnd ? e : pvEnd) : e
      }
      if (ph === 'MP') {
        mpStart = mpStart ? (s < mpStart ? s : mpStart) : s
        mpEnd = mpEnd ? (e > mpEnd ? e : mpEnd) : e
      }
    }
  }

  if (fcStart && fcEnd) {
    segments.push({ phase: 'FC', start: fcStart, end: fcEnd, label: 'FC' })
  } else if (!segments.length) {
    const base = addDays(today, -30)
    segments.push({ phase: 'FC', start: base, end: addDays(base, 60), label: 'FC (예정)' })
  }
  if (pvStart && pvEnd) {
    segments.push({ phase: 'PV', start: pvStart, end: pvEnd, label: 'PV' })
  } else {
    const last = segments[segments.length - 1]
    segments.push({
      phase: 'PV',
      start: last ? addDays(last.end, 1) : addDays(today, 30),
      end: last ? addDays(last.end, 45) : addDays(today, 75),
      label: 'PV',
    })
  }
  if (mpStart && mpEnd) {
    segments.push({ phase: 'MP', start: mpStart, end: mpEnd, label: 'MP' })
  } else {
    const last = segments[segments.length - 1]
    segments.push({
      phase: 'MP',
      start: last ? addDays(last.end, 1) : addDays(today, 90),
      end: last ? addDays(last.end, 120) : addDays(today, 180),
      label: 'MP',
    })
  }

  const rangeStart = segments[0].start.getTime()
  const rangeEnd = segments[segments.length - 1].end.getTime()
  const todayRatio = Math.min(1, Math.max(0, (today.getTime() - rangeStart) / (rangeEnd - rangeStart || 1)))

  let activePhase: MilestonePhase | null = null
  for (const seg of segments) {
    if (today >= seg.start && today <= seg.end) activePhase = seg.phase
  }

  return { segments, today, activePhase, todayRatio }
}

export type SignalTone = 'green' | 'amber' | 'red'

export function overallSignal(
  model: OverviewModel | null,
  verificationRows: ModelRow[],
  timeline: MilestoneTimeline,
): SignalTone {
  const code = model?.model ?? ''
  const rows = verificationRows.filter((r) => canonicalModelName(r.model) === canonicalModelName(code))
  if (rows.some((r) => r.status === 'NG' || r.status === '지연')) return 'red'
  if (rows.some((r) => r.status === '진행중')) return 'amber'
  if (timeline.activePhase === 'FC' && !rows.length) return 'amber'
  return 'green'
}

export function verificationIssueCounts(model: OverviewModel | null, verificationRows: ModelRow[]) {
  const code = model?.model ?? ''
  const rows = verificationRows.filter((r) => canonicalModelName(r.model) === canonicalModelName(code))
  const open = rows.filter((r) => r.status === 'NG' || r.status === '지연' || r.status === '진행중').length
  const total = rows.length || 1
  const closed = rows.filter((r) => r.status === '완료' || r.status === '검증제외').length
  return { open, closed, total: rows.length, prdClosed: closed, prdTotal: Math.max(rows.length, 4) }
}

export function fmtShortDate(d: Date) {
  const y = d.getFullYear() % 100
  return `${y}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
