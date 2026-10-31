/** 2026 Audio release — IR1~IR5, SP01~SP26 (BE calendar 와 동일) */

export interface ReleaseSprintDef {
  sp: number
  ir: number
  key: string
  label: string
  startDate: string
  endDate: string
}

const RAW: Array<[number, number, string, string, string]> = [
  [1, 1, '01', '2026-01-05', '2026-01-16'],
  [2, 1, '02', '2026-01-19', '2026-01-30'],
  [3, 1, '03', '2026-02-02', '2026-02-13'],
  [4, 1, '04', '2026-02-16', '2026-02-27'],
  [5, 1, '05', '2026-03-02', '2026-03-13'],
  [6, 2, '06', '2026-03-16', '2026-03-27'],
  [7, 2, '07', '2026-03-30', '2026-04-10'],
  [8, 2, '08', '2026-04-13', '2026-04-24'],
  [9, 2, '09', '2026-04-27', '2026-05-08'],
  [10, 2, '10', '2026-05-11', '2026-05-22'],
  [11, 3, '11', '2026-05-25', '2026-06-05'],
  [12, 3, '12', '2026-06-08', '2026-06-19'],
  [13, 3, '13', '2026-06-22', '2026-07-03'],
  [14, 3, '14', '2026-07-06', '2026-07-17'],
  [15, 3, '15', '2026-07-20', '2026-07-31'],
  [16, 4, '16', '2026-08-03', '2026-08-14'],
  [17, 4, '17', '2026-08-17', '2026-08-28'],
  [18, 4, '18', '2026-08-31', '2026-09-11'],
  [19, 4, '19', '2026-09-14', '2026-09-25'],
  [20, 4, '20', '2026-09-28', '2026-10-09'],
  [21, 5, '21', '2026-10-12', '2026-10-23'],
  [22, 5, '22', '2026-10-26', '2026-11-06'],
  [23, 5, '23', '2026-11-09', '2026-11-20'],
  [24, 5, '24', '2026-11-23', '2026-12-04'],
  [25, 5, '25', '2026-12-07', '2026-12-18'],
  [26, 5, '26', '2026-12-21', '2027-01-01'],
]

function mdLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export const RELEASE_SPRINTS_2026: ReleaseSprintDef[] = RAW.map(([sp, ir, suf, start, end]) => {
  const key = `2026_IR${ir}SP${suf}`
  return {
    sp,
    ir,
    key,
    label: `${key}(${mdLabel(start)}-${mdLabel(end)})`,
    startDate: start,
    endDate: end,
  }
})

export const RELEASE_IR_BANDS_2026 = [
  { id: 'ir1', title: 'IR1', subtitle: 'SP01 ~ SP05', sprintFrom: 1, sprintTo: 5 },
  { id: 'ir2', title: 'IR2', subtitle: 'SP06 ~ SP10', sprintFrom: 6, sprintTo: 10 },
  { id: 'ir3', title: 'IR3', subtitle: 'SP11 ~ SP15', sprintFrom: 11, sprintTo: 15 },
  { id: 'ir4', title: 'IR4', subtitle: 'SP16 ~ SP20', sprintFrom: 16, sprintTo: 20 },
  { id: 'ir5', title: 'IR5', subtitle: 'SP21 ~ SP26', sprintFrom: 21, sprintTo: 26 },
]

export function releaseCalendarFallback() {
  return {
    sprintMin: 1,
    sprintMax: 26,
    sprints: RELEASE_SPRINTS_2026,
    irBands: RELEASE_IR_BANDS_2026,
  }
}
