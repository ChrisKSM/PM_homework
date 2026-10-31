/** 모델현황 선택 비활성 — catalog와 분리해 부분 FE 패치 시에도 import 안정 */
export const MODEL_STATUS_DISABLED_MODELS = new Set<string>(['H5', 'M5_VI'])

export function isModelStatusModelDisabled(modelCode: string): boolean {
  return MODEL_STATUS_DISABLED_MODELS.has(modelCode.trim().toUpperCase().replace(/-/g, '_'))
}
