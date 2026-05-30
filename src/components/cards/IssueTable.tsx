import clsx from 'clsx'
import type { SprintIssue } from '../../types/jira'

interface Props {
  issues: SprintIssue[]
}

const TYPE_STYLES: Record<string, string> = {
  Epic: 'bg-purple-50 text-purple-700',
  Story: 'bg-blue-50 text-blue-700',
  'Sub-task': 'bg-sky-50 text-sky-700',
  Bug: 'bg-red-50 text-lg-red',
  Task: 'bg-gray-100 text-gray-700',
}

/**
 * 상태 색상 — Open=주황·SOC DEVELOP=파랑·SoC Review=보라·Closed=회색·
 * Reopened=진한빨강·SOC DELIVERED=녹색·Developer Draft=청록
 * ('SoC ~'가 여러 개라 구체 키워드 우선: reopen→draft→develop→review→deliver→close→open)
 */
function statusTone(status: string): { dot: string; text: string } {
  const s = (status || '').toLowerCase()
  if (s.includes('reopen')) return { dot: 'bg-red-700', text: 'text-red-700' }
  if (s.includes('draft')) return { dot: 'bg-cyan-600', text: 'text-cyan-700' }
  if (s.includes('develop') || s.includes('progress')) return { dot: 'bg-blue-500', text: 'text-blue-600' }
  if (s.includes('review')) return { dot: 'bg-violet-500', text: 'text-violet-600' }
  if (s.includes('deliver') || s.includes('done') || s.includes('resolved') || s.includes('완료'))
    return { dot: 'bg-emerald-500', text: 'text-emerald-600' }
  if (s.includes('close')) return { dot: 'bg-gray-400', text: 'text-gray-500' }
  if (s.includes('open') || s.includes('to do') || s.includes('todo') || s.includes('backlog'))
    return { dot: 'bg-orange-500', text: 'text-orange-600' }
  if (s.includes('block')) return { dot: 'bg-lg-red', text: 'text-lg-red' }
  return { dot: 'bg-gray-400', text: 'text-gray-500' }
}

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'text-lg-red font-semibold',
  High: 'text-orange-600 font-semibold',
  Medium: 'text-amber-600 font-semibold',
  Low: 'text-gray-500 font-medium',
}

export default function IssueTable({ issues }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider w-28">이슈 ID</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider w-20">유형</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">제목</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider w-24">담당자</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider w-28">상태</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider w-20">우선순위</th>
            <th className="text-right py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider w-16">SP</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr
              key={issue.issueKey}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                issue.status === 'Blocked' && 'bg-lg-red-light/40'
              )}
            >
              <td className="py-3 px-4">
                {issue.issueUrl ? (
                  <a
                    href={issue.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-lg-red text-xs font-bold hover:underline"
                  >
                    {issue.issueKey}
                  </a>
                ) : (
                  <span className="font-mono text-lg-red text-xs font-bold">{issue.issueKey}</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded text-xs font-semibold', TYPE_STYLES[issue.issueType] ?? 'bg-gray-100 text-gray-700')}>
                  {issue.issueType}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-700 max-w-xs truncate font-medium">{issue.summary}</td>
              <td className="py-3 px-4 text-gray-600 text-xs font-medium">{issue.assignee}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', statusTone(issue.status).dot)} />
                  <span className={clsx('text-xs font-semibold', statusTone(issue.status).text)}>
                    {issue.status}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={clsx('text-xs', PRIORITY_BADGE[issue.priority])}>
                  {issue.priority}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-gray-700 font-mono text-xs bg-surface-page border border-surface-border px-2 py-0.5 rounded font-semibold">
                  {issue.storyPoints}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
