/** UI modelCode → TVPLAT Initiative Jira label (Davis / Sound Suite) */
export const MODEL_STATUS_INITIATIVE_JIRA_LABEL: Record<string, string> = {
  H7_VI: 'SoundSuite_H7(VI)',
}

export function initiativeJiraLabelForModel(modelCode: string): string | undefined {
  const key = modelCode.trim().toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_')
  if (MODEL_STATUS_INITIATIVE_JIRA_LABEL[key]) return MODEL_STATUS_INITIATIVE_JIRA_LABEL[key]
  if (/^H7[\s_]*VI$/i.test(modelCode.replace(/\s+/g, ' '))) {
    return MODEL_STATUS_INITIATIVE_JIRA_LABEL.H7_VI
  }
  return undefined
}
