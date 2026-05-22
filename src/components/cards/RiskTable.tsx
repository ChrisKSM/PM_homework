import clsx from 'clsx'
import type { RiskIssue } from '../../types/jira'

interface Props {
  issues: RiskIssue[]
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-50 text-lg-red border border-red-200',
  High: 'bg-orange-50 text-orange-700 border border-orange-200',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  Low: 'bg-gray-50 text-gray-600 border border-gray-200',
}

const STATUS_STYLES: Record<string, string> = {
  Blocked: 'text-lg-red font-semibold',
  'In Progress': 'text-blue-600 font-semibold',
  'In Review': 'text-amber-600 font-semibold',
  'To Do': 'text-gray-500 font-semibold',
  Done: 'text-emerald-600 font-semibold',
}

export default function RiskTable({ issues }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">이슈 ID</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">제목</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">담당자</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">상태</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">우선순위</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(issues) ? issues : []).map((issue, i) => (
            <tr
              key={issue.issueKey}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                issue.status === 'Blocked' && 'bg-lg-red-light/40'
              )}
            >
              <td className="py-3 px-4">
                <span className="font-mono text-lg-red text-xs font-bold">{issue.issueKey}</span>
              </td>
              <td className="py-3 px-4 text-gray-700 max-w-xs truncate font-medium">{issue.summary}</td>
              <td className="py-3 px-4 text-gray-600 font-medium">{issue.assignee}</td>
              <td className="py-3 px-4">
                <span className={STATUS_STYLES[issue.status] ?? 'text-gray-600'}>
                  {issue.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', PRIORITY_STYLES[issue.priority])}>
                  {issue.priority}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
