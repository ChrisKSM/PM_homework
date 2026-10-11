import client from './client'
import type { DeliveryPortalPayload } from '../types/deliveryPortal'

export const deliveryPortalApi = {
  ping: () =>
    client.get<{ ok: boolean; tokenLength: number; baseUrl: string }>('/delivery-portal/ping').then((r) => r.data),

  getAllDeliveries: () =>
    client.get<DeliveryPortalPayload>('/delivery-portal/all-deliveries').then((r) => r.data),
}
