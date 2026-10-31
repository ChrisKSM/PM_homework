import type { DeliveryPortalPayload } from '../types/deliveryPortal'

/** Davis MilestonePage 형태 — S80C / webOS26 데모 */
export const MOCK_DELIVERY_PORTAL: DeliveryPortalPayload = {
  global_data: {
    global_min_from: '2025-10-01',
    global_max_to: '2026-12-31',
  },
  platform_data: [
    {
      platform: 'webOS26',
      program_info: [
        {
          program: 'Audio_2026',
          program_detail: 'BT Soundbar S80C',
          details: [
            {
              department: 'Audio',
              soc: 'S80C',
              pl: 'seokmin.koh',
              status: 'In Progress',
              region: 'KR',
              site: 'LGE',
              show: 'Y',
              schedules: [
                {
                  test_name: 'FC1',
                  plan_start_date: '2026-01-06',
                  plan_end_date: '2026-01-24',
                  actual_start_date: '2026-01-08',
                  actual_end_date: '2026-01-22',
                },
                {
                  test_name: 'SIT_Round1',
                  plan_start_date: '2026-02-03',
                  plan_end_date: '2026-03-14',
                  actual_start_date: '2026-02-05',
                  actual_end_date: '2026-03-20',
                },
                {
                  test_name: 'QP',
                  plan_start_date: '2026-03-17',
                  plan_end_date: '2026-04-11',
                },
                {
                  test_name: 'SU_Test',
                  plan_start_date: '2026-04-14',
                  plan_end_date: '2026-05-09',
                  actual_start_date: '2026-04-14',
                  actual_end_date: '',
                },
                {
                  test_name: 'HW_EVT',
                  plan_start_date: '2025-11-10',
                  plan_end_date: '2025-12-05',
                  actual_start_date: '2025-11-12',
                  actual_end_date: '2025-12-08',
                },
              ],
            },
            {
              department: 'Audio',
              soc: 'S80C',
              pl: 'hyunja.kim',
              status: 'Complete',
              region: 'US',
              site: 'LGE',
              show: 'Y',
              schedules: [
                {
                  test_name: 'Dev_Bringup',
                  plan_start_date: '2025-09-15',
                  plan_end_date: '2025-10-20',
                  actual_start_date: '2025-09-15',
                  actual_end_date: '2025-10-18',
                },
                {
                  test_name: 'INT_Audio',
                  plan_start_date: '2025-10-21',
                  plan_end_date: '2025-11-14',
                  actual_start_date: '2025-10-22',
                  actual_end_date: '2025-11-20',
                },
              ],
            },
          ],
        },
        {
          program: 'SoundSuite_H7',
          program_detail: 'H7 VI',
          details: [
            {
              department: 'Audio',
              soc: 'O24N',
              pl: 'pm.kim',
              status: 'In Progress',
              show: 'Y',
              schedules: [
                {
                  test_name: 'FC2',
                  plan_start_date: '2026-02-01',
                  plan_end_date: '2026-02-28',
                  actual_start_date: '2026-02-03',
                  actual_end_date: '2026-03-02',
                },
                {
                  test_name: 'SIT_Full',
                  plan_start_date: '2026-03-03',
                  plan_end_date: '2026-04-30',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      platform: 'webOS25',
      program_info: [
        {
          program: 'Legacy_Audio',
          details: [
            {
              department: 'Audio',
              soc: 'S90C',
              pl: 'owner',
              status: 'Complete',
              show: 'Y',
              schedules: [
                {
                  test_name: 'QP',
                  plan_start_date: '2025-06-01',
                  plan_end_date: '2025-06-30',
                  actual_start_date: '2025-06-01',
                  actual_end_date: '2025-06-28',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
