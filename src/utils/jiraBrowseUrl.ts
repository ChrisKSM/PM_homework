const DEFAULT_JIRA_BROWSE = 'https://harmony.lge.com:8443/issue/browse'

/** Jira 이슈 browse URL (BE issueUrl 우선) */
export function jiraBrowseUrl(issueKey: string, issueUrl?: string): string {
  if (issueUrl?.trim()) return issueUrl.trim()
  const key = issueKey.trim()
  if (!key) return '#'
  const base = (import.meta as unknown as { env?: { VITE_JIRA_BROWSE_BASE?: string } }).env
    ?.VITE_JIRA_BROWSE_BASE
  return `${base || DEFAULT_JIRA_BROWSE}/${key}`
}
