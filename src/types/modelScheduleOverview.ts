/** 전 모델 일정 — 스프레드시트 A~N 열 구조 */

export type OverviewBarType = 'sit' | 'dev_test' | 'fc' | 'prepv' | 'pv' | 'mp' | 'preqp' | 'qp' | 'su' | 'ats' | 'default'

export type OverviewEventKind = 'hw' | 'sw'

export interface OverviewEvent {
  name: string
  start: string
  end: string
  barType?: OverviewBarType
  kind?: OverviewEventKind
}

export interface OverviewModel {
  id: string
  category: string
  model: string
  variant: string
  /** legacy — UI 미표시 */
  manufacturer?: string
  soc: string
  /** legacy */
  hwPm?: string
  /** legacy */
  swPo?: string
  /** E열 SW 담당 */
  swPm: string
  spec: string
  pv: string
  mp: string
  /** legacy — HW Event ATS 로 표시 */
  ats?: string
  events: OverviewEvent[]
}

export interface OverviewScheduleBar {
  start: string
  end: string
  label: string
  barType: OverviewBarType
  kind: OverviewEventKind
}

/** 테이블 1줄 — MR_Minor 1행(SW) / 그 외 2행(HW+SW) */
export interface OverviewDisplayRow {
  id: string
  modelId: string
  lineIndex: number
  category: string
  model: string
  variant: string
  soc: string
  swPm: string
  spec: string
  pv: string
  mp: string
  bars: OverviewScheduleBar[]
  timelineKind: OverviewEventKind | 'none'
  isMrMinor: boolean
}
