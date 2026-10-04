/** 전 모델 일정 — 스프레드시트 기반 구조 */

export type OverviewBarType = 'sit' | 'dev_test' | 'fc' | 'prepv' | 'pv' | 'mp' | 'preqp' | 'qp' | 'su' | 'default'

export interface OverviewEvent {
  name: string
  start: string
  end: string
  barType?: OverviewBarType
}

export interface OverviewModel {
  id: string
  category: string
  model: string
  variant: string
  manufacturer: string
  soc: string
  hwPm: string
  swPo: string
  swPm: string
  spec: string
  pv: string
  mp: string
  ats: string
  events: OverviewEvent[]
}

export interface OverviewScheduleBar {
  start: string
  end: string
  label: string
  barType: OverviewBarType
}

/** 테이블 1줄 — MR_Minor 는 1행, 그 외 2행(0=메타, 1=일정 바) */
export interface OverviewDisplayRow {
  id: string
  modelId: string
  lineIndex: number
  category: string
  model: string
  variant: string
  manufacturer: string
  soc: string
  hwPm: string
  swPo: string
  swPm: string
  spec: string
  pv: string
  mp: string
  ats: string
  bars: OverviewScheduleBar[]
  /** false → 메타만, true → 타임라인 바 표시 행 */
  showTimeline: boolean
  isMrMinor: boolean
}
