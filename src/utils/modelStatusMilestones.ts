import type { OverviewModel } from '../types/modelScheduleOverview'
import type { ModelRow } from './modelScheduleRows'
import { canonicalModelName } from './modelScheduleRows'
import {
  classifyEventKind,
  filterEventsForTimeline,
  isValidOverviewEvent,
} from './modelScheduleOverviewRows'

export type MilestonePhase = 'FC' | 'PV' | 'MP'

export interface PhaseSegment {
  phase: MilestonePhase
  start: Date
  end: Date
  label: string
  /** 구간 길이 비율 (타임라인 flex) */
  durationDays: number
}

export interface MilestoneTimeline {
  segments: PhaseSegment[]
  today: Date
  activePhase: MilestonePhase | null
  todayRatio: number
  source: 'hw-overview' | 'mixed' | 'fallback'
}

function parseIso(s: string | undefined): Date | null {
  const t = String(s ?? '').trim().slice(0, 10)
  if (!t || t === '-' || t === 'NA') return null
  const d = new Date(`${t}T12:00:00`)
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

function spanDays(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

function hwPhase(name: string): MilestonePhase | null {
  const u = name.trim().toUpperCase()
  if (u === 'PREPV' || u === 'PRE-PV') return 'FC'
  if (u === 'PV1' || u === 'PV2' || u === 'PV') return 'PV'
  if (u === 'MP') return 'MP'
  return null
}

function mergeSpan(a: { start: Date; end: Date } | null, s: Date, e: Date) {
  if (!a) return { start: s, end: e }
  return {
    start: s < a.start ? s : a.start,
    end: e > a.end ? e : a.end,
  }
}

/**
 * @deprecated UI는 buildOverviewEventsTimeline(HW·SW 개별 이벤트) 사용.
 * PrePV를 FC로 묶지 않음 — FC는 SW Event(SIT/FC/QP) 전용.
 */
export function buildHwEventTimeline(model: OverviewModel | null): MilestoneTimeline | null {
  if (!model?.events?.length) return null
  let fc: { start: Date; end: Date } | null = null
  let pv: { start: Date; end: Date } | null = null
  let mp: { start: Date; end: Date } | null = null

  for (const ev of model.events) {
    if (ev.kind !== 'hw') continue
    const ph = hwPhase(ev.name)
    if (!ph) continue
    const s = parseIso(ev.start)
    let e = parseIso(ev.end) ?? s
    if (!s) continue
    if (!e || e < s) e = s
    if (ph === 'FC') fc = mergeSpan(fc, s, e)
    if (ph === 'PV') pv = mergeSpan(pv, s, e)
    if (ph === 'MP') mp = mergeSpan(mp, s, e)
  }

  const segments: PhaseSegment[] = []
  if (fc) {
    segments.push({
      phase: 'FC',
      start: fc.start,
      end: fc.end,
      label: 'FC',
      durationDays: spanDays(fc.start, fc.end),
    })
  }
  if (pv) {
    segments.push({
      phase: 'PV',
      start: pv.start,
      end: pv.end,
      label: 'PV',
      durationDays: spanDays(pv.start, pv.end),
    })
  }
  if (mp) {
    segments.push({
      phase: 'MP',
      start: mp.start,
      end: mp.end,
      label: 'MP',
      durationDays: spanDays(mp.start, mp.end),
    })
  }
  if (!segments.length) return null
  return finalizeTimeline(segments, 'hw-overview')
}

function finalizeTimeline(segments: PhaseSegment[], source: MilestoneTimeline['source']): MilestoneTimeline {
  const today = dayStart(new Date())
  const rangeStart = segments[0].start.getTime()
  const rangeEnd = segments[segments.length - 1].end.getTime()
  const todayRatio = Math.min(1, Math.max(0, (today.getTime() - rangeStart) / (rangeEnd - rangeStart || 1)))
  let activePhase: MilestonePhase | null = null
  for (const seg of segments) {
    if (today >= seg.start && today <= seg.end) activePhase = seg.phase
  }
  return { segments, today, activePhase, todayRatio, source }
}

/** @deprecated 검증 일정 혼합 — 모델현황 바는 buildHwEventTimeline 우선 */
export function buildMilestoneTimeline(model: OverviewModel | null, verificationRows: ModelRow[]): MilestoneTimeline {
  const hw = buildHwEventTimeline(model)
  if (hw) return hw

  const today = dayStart(new Date())
  const segments: PhaseSegment[] = []
  const code = model?.model ?? ''
  const vRows = verificationRows.filter((r) => canonicalModelName(r.model) === canonicalModelName(code))

  let fcStart: Date | null = null
  let fcEnd: Date | null = null
  let pvStart: Date | null = null
  let pvEnd: Date | null = null
  let mpStart: Date | null = null
  let mpEnd: Date | null = null

  for (const r of vRows) {
    for (const b of r.bars ?? []) {
      const lab = (b.label ?? r.event ?? '').toUpperCase()
      const ph = hwPhase(lab) ?? (/\bFC\b/.test(lab) ? 'FC' : /\bPV\b/.test(lab) ? 'PV' : /\bMP\b/.test(lab) ? 'MP' : null)
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
    segments.push({ phase: 'FC', start: fcStart, end: fcEnd, label: 'FC', durationDays: spanDays(fcStart, fcEnd) })
  }
  if (pvStart && pvEnd) {
    segments.push({ phase: 'PV', start: pvStart, end: pvEnd, label: 'PV', durationDays: spanDays(pvStart, pvEnd) })
  }
  if (mpStart && mpEnd) {
    segments.push({ phase: 'MP', start: mpStart, end: mpEnd, label: 'MP', durationDays: spanDays(mpStart, mpEnd) })
  }

  if (!segments.length) {
    const base = addDays(today, -30)
    segments.push(
      { phase: 'FC', start: base, end: addDays(base, 60), label: 'FC (예정)', durationDays: 61 },
      { phase: 'PV', start: addDays(base, 61), end: addDays(base, 105), label: 'PV', durationDays: 45 },
      { phase: 'MP', start: addDays(base, 106), end: addDays(base, 226), label: 'MP', durationDays: 121 },
    )
    return finalizeTimeline(segments, 'fallback')
  }
  while (segments.length < 3) {
    const last = segments[segments.length - 1]
    const nextPhase = segments.length === 1 ? 'PV' : 'MP'
    segments.push({
      phase: nextPhase,
      start: addDays(last.end, 1),
      end: addDays(last.end, 30),
      label: nextPhase,
      durationDays: 30,
    })
  }
  return finalizeTimeline(segments, 'mixed')
}

export type SignalTone = 'green' | 'amber' | 'red'

export function overallSignal(
  model: OverviewModel | null,
  verificationRows: ModelRow[],
  eventsTimeline: OverviewEventsTimeline | null,
): SignalTone {
  const code = model?.model ?? ''
  const rows = verificationRows.filter((r) => canonicalModelName(r.model) === canonicalModelName(code))
  if (rows.some((r) => r.status === 'NG' || r.status === '지연')) return 'red'
  if (rows.some((r) => r.status === '진행중')) return 'amber'
  if (!eventsTimeline?.hwBars.length && !rows.length) return 'amber'
  return 'green'
}

export function verificationIssueCounts(model: OverviewModel | null, verificationRows: ModelRow[]) {
  const code = model?.model ?? ''
  const rows = verificationRows.filter((r) => canonicalModelName(r.model) === canonicalModelName(code))
  const open = rows.filter((r) => r.status === 'NG' || r.status === '지연' || r.status === '진행중').length
  const closed = rows.filter((r) => r.status === '완료' || r.status === '검증제외').length
  return { open, closed, total: rows.length, prdClosed: closed, prdTotal: Math.max(rows.length, 4) }
}

export function fmtShortDate(d: Date) {
  const y = d.getFullYear() % 100
  return `${y}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export interface OverviewEventBar {
  name: string
  kind: 'hw' | 'sw'
  start: Date
  end: Date
  leftPct: number
  widthPct: number
}

export interface OverviewEventsTimeline {
  rangeStart: Date
  rangeEnd: Date
  today: Date
  todayRatio: number
  hwBars: OverviewEventBar[]
  swBars: OverviewEventBar[]
  activeEventLabel: string | null
}

function eventKindForBar(name: string, kind?: string): 'hw' | 'sw' | null {
  const k = classifyEventKind(name, kind)
  return k === 'hw' || k === 'sw' ? k : null
}

/** 전 모델 일정 overview — HW·SW 이벤트를 동일 시간축(상대 비율)에 배치 (PrePV/PV1/… · SIT/FC/QP) */
export function buildOverviewEventsTimeline(model: OverviewModel | null): OverviewEventsTimeline | null {
  if (!model?.events?.length) return null
  const parsed: { name: string; kind: 'hw' | 'sw'; start: Date; end: Date }[] = []
  const hwList = filterEventsForTimeline(model.events, 'hw')
  const swList = filterEventsForTimeline(model.events, 'sw')
  for (const ev of [...hwList, ...swList]) {
    if (!isValidOverviewEvent(ev)) continue
    const kind = eventKindForBar(ev.name, ev.kind)
    if (!kind) continue
    const s = parseIso(ev.start)
    let e = parseIso(ev.end) ?? s
    if (!s) continue
    if (!e || e < s) e = s
    parsed.push({ name: ev.name.trim(), kind, start: s, end: e })
  }
  if (!parsed.length) return null

  let rangeStart = parsed[0].start
  let rangeEnd = parsed[0].end
  for (const p of parsed) {
    if (p.start < rangeStart) rangeStart = p.start
    if (p.end > rangeEnd) rangeEnd = p.end
  }
  const spanMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 86400000)
  const today = dayStart(new Date())
  const todayRatio = Math.min(1, Math.max(0, (today.getTime() - rangeStart.getTime()) / spanMs))

  const toBar = (p: (typeof parsed)[0]): OverviewEventBar => {
    const leftPct = ((p.start.getTime() - rangeStart.getTime()) / spanMs) * 100
    const widthPct = Math.max(((p.end.getTime() - p.start.getTime()) / spanMs) * 100, 1.2)
    return { name: p.name, kind: p.kind, start: p.start, end: p.end, leftPct, widthPct }
  }

  const hwBars = parsed.filter((p) => p.kind === 'hw').sort((a, b) => a.start.getTime() - b.start.getTime()).map(toBar)
  const swBars = parsed.filter((p) => p.kind === 'sw').sort((a, b) => a.start.getTime() - b.start.getTime()).map(toBar)

  let activeEventLabel: string | null = null
  for (const p of parsed) {
    if (today >= p.start && today <= p.end) activeEventLabel = `${p.kind.toUpperCase()} · ${p.name}`
  }

  return { rangeStart, rangeEnd, today, todayRatio, hwBars, swBars, activeEventLabel }
}
