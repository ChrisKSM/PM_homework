/**
 * 스프린트 탭 — Initiative / 릴리즈·Epic 과 동일 TV Jira label (Harmony 보드 아님)
 */
import {
  MODEL_STATUS_INITIATIVE_JIRA_LABEL,
  initiativeJiraLabelForModel,
} from './modelStatusInitiativeJiraLabels'

export const MODEL_SPRINT_JIRA_MODELS = new Set(Object.keys(MODEL_STATUS_INITIATIVE_JIRA_LABEL))

export const sprintJiraLabelForModel = initiativeJiraLabelForModel
