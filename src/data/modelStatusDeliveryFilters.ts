import type { ModelStatusProductGroupId } from './modelStatusCatalog'
import type { DeliveryAppliedFilters } from '../types/deliveryPortal'

/** 모델현황 modelCode → Delivery Portal 조회 기본값 (Davis 필터 연쇄) */
export function defaultDeliveryFilters(
  modelCode: string,
  groupId: ModelStatusProductGroupId,
): Partial<DeliveryAppliedFilters> {
  const soc = modelCode.replace(/_/g, '-').replace(/\s+/g, '')
  const base: Partial<DeliveryAppliedFilters> = {
    department: 'Audio',
    platform: '',
    soc,
    program: '',
    status: '',
  }

  switch (groupId) {
    case 'bt-soundbar':
      return { ...base, soc: modelCode === 'SB_CH' ? 'SB' : modelCode, platform: 'webOS26' }
    case 'wifi-soundbar':
      return { ...base, soc: modelCode, platform: 'webOS26' }
    case 'sound-suite':
      return {
        ...base,
        soc: modelCode.includes('H7') ? 'O24N' : modelCode.replace('_VI', ''),
        platform: 'webOS26',
      }
    default:
      return base
  }
}
