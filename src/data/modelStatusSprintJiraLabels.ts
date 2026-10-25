/** UI modelCode → Harmony Jira Story labels (sprint scope) */
export const MODEL_SPRINT_JIRA_LABEL: Record<string, string> = {
  H7_VI: 'SoundSuite_H7(VI)',
  S80C: 'S80C',
  S90C: 'S90C',
  'CB-SH': 'CB-SH',
  CB_SH: 'CB-SH',
}

export const MODEL_SPRINT_JIRA_MODELS = new Set(Object.keys(MODEL_SPRINT_JIRA_LABEL))

export function sprintJiraLabelForModel(modelCode: string): string | undefined {
  const key = modelCode.trim().toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_')
  if (MODEL_SPRINT_JIRA_LABEL[key]) return MODEL_SPRINT_JIRA_LABEL[key]
  if (MODEL_SPRINT_JIRA_LABEL[modelCode.trim()]) return MODEL_SPRINT_JIRA_LABEL[modelCode.trim()]
  if (/^H7[\s_]*VI$/i.test(modelCode.replace(/\s+/g, ' '))) {
    return MODEL_SPRINT_JIRA_LABEL.H7_VI
  }
  return undefined
}
