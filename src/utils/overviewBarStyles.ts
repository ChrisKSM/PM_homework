import type { OverviewBarType, OverviewEventKind } from '../types/modelScheduleOverview'

/** HW Event (I~K) — 주황/하늘/녹색 계열 */
export const HW_BAR_STYLE: Record<OverviewBarType, { bg: string; text: string }> = {
  prepv: { bg: '#FB923C', text: '#fff' },
  pv: { bg: '#0EA5E9', text: '#fff' },
  mp: { bg: '#16A34A', text: '#fff' },
  ats: { bg: '#64748B', text: '#fff' },
  sit: { bg: '#CBD5E1', text: '#334155' },
  dev_test: { bg: '#CBD5E1', text: '#334155' },
  fc: { bg: '#CBD5E1', text: '#334155' },
  preqp: { bg: '#CBD5E1', text: '#334155' },
  qp: { bg: '#CBD5E1', text: '#334155' },
  su: { bg: '#CBD5E1', text: '#334155' },
  default: { bg: '#94A3B8', text: '#fff' },
}

/** SW Event (L~N) — SIT/FC/QP 등 구분 */
export const SW_BAR_STYLE: Record<OverviewBarType, { bg: string; text: string }> = {
  sit: { bg: '#FACC15', text: '#78350F' },
  dev_test: { bg: '#FDE68A', text: '#92400E' },
  fc: { bg: '#E2E8F0', text: '#334155' },
  prepv: { bg: '#FDBA74', text: '#7C2D12' },
  pv: { bg: '#BAE6FD', text: '#0C4A6E' },
  mp: { bg: '#86EFAC', text: '#14532D' },
  preqp: { bg: '#C4B5FD', text: '#4C1D95' },
  qp: { bg: '#A78BFA', text: '#fff' },
  su: { bg: '#EF4444', text: '#fff' },
  ats: { bg: '#94A3B8', text: '#fff' },
  default: { bg: '#94A3B8', text: '#fff' },
}

export function barStyleForKind(kind: OverviewEventKind, barType: OverviewBarType) {
  return kind === 'hw' ? HW_BAR_STYLE[barType] : SW_BAR_STYLE[barType]
}

export const HW_LEGEND = [
  { type: 'prepv' as OverviewBarType, label: 'PrePV' },
  { type: 'pv' as OverviewBarType, label: 'PV' },
  { type: 'mp' as OverviewBarType, label: 'MP' },
  { type: 'ats' as OverviewBarType, label: 'ATS' },
]

export const SW_LEGEND = [
  { type: 'sit' as OverviewBarType, label: 'SIT' },
  { type: 'dev_test' as OverviewBarType, label: 'Dev Test' },
  { type: 'fc' as OverviewBarType, label: 'FC' },
  { type: 'qp' as OverviewBarType, label: 'QP' },
  { type: 'su' as OverviewBarType, label: 'SU' },
]
