/** SW 담당(개발) 이름 → @lge.com — BE config MODEL_SCHEDULE_SHARE_DEV_RECIPIENTS 와 동기화 */
const SW_PM_NAME_TO_EMAIL: Record<string, string> = {
  고석민: 'seokmin.koh@lge.com',
  김현자: 'hyunja.kim@lge.com',
  조성연: 'sungyeon.cho@lge.com',
  이홍순: 'hongsoon.lee@lge.com',
  박윤규: 'yoonkyu.park@lge.com',
  오제준: 'jejun.oh@lge.com',
  박시형: 'sh12.park@lge.com',
  나택수: 'taeksu.la@lge.com',
  조용승: 'yongseung.cho@lge.com',
  이마을: 'maeul.lee@lge.com',
  윤필규: 'pilkyu.yoon@lge.com',
  이재철: 'jaecheol.lee@lge.com',
}

function splitStaffNames(raw: string): string[] {
  return raw
    .split(/[/,·|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 전 모델 일정 models[].swPm → 개발 수신자 메일 (중복 제거, 입력 순서 유지) */
export function devEmailsFromSwPm(models: { swPm?: string }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of models) {
    for (const name of splitStaffNames(String(m.swPm ?? ''))) {
      const email = SW_PM_NAME_TO_EMAIL[name]
      if (email && !seen.has(email)) {
        seen.add(email)
        out.push(email)
      }
    }
  }
  return out
}
