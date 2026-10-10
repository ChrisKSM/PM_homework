import { useQuery } from '@tanstack/react-query'
import { deliveryPortalApi } from '../api/deliveryPortalApi'
import { USE_MOCK } from '../config/dataSource'
import type { DeliveryPortalPayload } from '../types/deliveryPortal'

const empty: DeliveryPortalPayload = { platform_data: [] }

export function useDeliveryPortalData(enabled: boolean) {
  return useQuery({
    queryKey: ['deliveryPortal', 'all'],
    enabled: enabled && !USE_MOCK,
    staleTime: 10 * 60 * 1000,
    queryFn: () => deliveryPortalApi.getAllDeliveries(),
    retry: 1,
  })
}

export { empty as EMPTY_DELIVERY_PAYLOAD }
