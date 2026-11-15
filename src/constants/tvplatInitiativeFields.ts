/**
 * TVPLAT Initiative Jira 필드 — Davis InitiativePage INITIATIVE_FIELDS 와 동일.
 * BE config (initiative_*_field) 와 맞춰 둠.
 */
export const TVPLAT_INITIATIVE_FIELD_IDS = {
  startDate: 'customfield_35441',
  grouping: 'customfield_35455',
  categorization: 'customfield_35516',
  estimatedEffort: 'customfield_35454',
  storyPoints: 'customfield_10002',
  sprint: 'customfield_10005',
} as const

export const TVPLAT_INITIATIVE_LIST_FIELDS = [
  'key',
  'summary',
  'status',
  'assignee',
  'reporter',
  'duedate',
  'priority',
  'fixVersions',
  'components',
  'labels',
  ...Object.values(TVPLAT_INITIATIVE_FIELD_IDS),
].join(',')
