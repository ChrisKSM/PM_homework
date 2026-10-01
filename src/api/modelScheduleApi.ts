import client from './client'

export const modelScheduleApi = {
  load: () =>
    client.get<{ rows: any[]; count: number }>('/model-schedule/load').then(r => r.data),

  save: (rows: any[]) =>
    client.post<{ saved: number; message: string }>('/model-schedule/save', { rows }).then(r => r.data),
}
