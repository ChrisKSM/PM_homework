/** labels / fixVersions 기준 MVP 여부 (BE와 동일 규칙) */
export function isMvpLabel(label: string): boolean {
  const norm = label.toLowerCase().replace(/[_\-\s]/g, '')
  return norm === 'mvp' || norm.startsWith('mvp')
}

export function rowMvpLabels(labels: string[]): string[] {
  return labels.filter(isMvpLabel)
}
