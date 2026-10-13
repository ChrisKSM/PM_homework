/** Delivery Portal all_deliveries_data (Davis MilestonePage) */

export interface DeliverySchedule {
  test_name: string
  plan_start_date?: string
  plan_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  TVEVENT?: string
}

export interface DeliveryDetail {
  department?: string
  soc?: string
  pl?: string
  status?: string
  region?: string
  site?: string
  show?: string
  schedules?: DeliverySchedule[]
}

export interface DeliveryProgramInfo {
  program: string
  program_detail?: string
  details?: DeliveryDetail[]
}

export interface DeliveryPlatformBlock {
  platform: string
  program_info?: DeliveryProgramInfo[]
}

export interface DeliveryPortalPayload {
  global_data?: {
    global_min_from?: string
    global_max_to?: string
  }
  platform_data?: DeliveryPlatformBlock[]
}

export interface DeliveryAppliedFilters {
  department: string
  platform: string
  soc: string
  program: string
  status: string
}

export interface DeliveryDetailRow extends DeliveryDetail {
  _program: string
  _programDetail?: string
}
