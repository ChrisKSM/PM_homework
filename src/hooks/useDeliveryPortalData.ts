import { useQuery } from '@tanstack/react-query'
import { deliveryPortalApi } from '../api/deliveryPortalApi'
import { useDeliveryPortalMockData } from '../config/deliveryPortalMock'
import { MOCK_DELIVERY_PORTAL } from '../mocks/mockDeliveryPortalData'
import type { DeliveryPortalPayload } from '../types/deliveryPortal'

const empty: DeliveryPortalPayload = { platform_data: [] }

export function useDeliveryPortalData(enabled: boolean) {
  const mockMode = useDeliveryPortalMockData()

  return useQuery({
    queryKey: ['deliveryPortal', 'all', mockMode ? 'mock' : 'live'],
    enabled,
    staleTime: mockMode ? Infinity : 10 * 60 * 1000,
    queryFn: async () => {
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 350))
        return MOCK_DELIVERY_PORTAL
      }
      return deliveryPortalApi.getAllDeliveries()
    },
    retry: mockMode ? 0 : 1,
  })
}

export function useDeliveryPortalIsMock(): boolean {
  return useDeliveryPortalMockData()
}

export { empty as EMPTY_DELIVERY_PAYLOAD }
