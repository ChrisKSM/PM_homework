import clsx from 'clsx'
import type { RiskIssueRow } from '../../types/risk'

interface Props {
  issues: RiskIssueRow[]
  showResponsePlan?: boolean
}

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-red-50 text-lg-red border border-red-200',
  P1: 'bg-orange-50 text-orange-700 border border-orange-200',
  P2: 'bg-amber-50 text-amber-700 border border-amber-200',
  P3: 'bg-gray-50 text-gray-600 border border-gray-200',
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export default function RiskIssueTable({ issues, showResponsePlan = true }: Props) {
  if (!issues.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-8 font-medium">
        해당 조건의 리스크 이슈가 없습니다.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Key</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Pri</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">범주</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Summary</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">담당</th>
            {showResponsePlan && (
              <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">
                대응 계획 (Description)
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr
              key={issue.issueKey}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                issue.missingPlan && 'bg-lg-red-light/30'
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
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold',
                    PRIORITY_STYLES[issue.priority] ?? PRIORITY_STYLES.P3
                  )}
                >
                  {issue.priority}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-600 font-medium">{issue.category}</td>
              <td className="py-3 px-4 text-gray-700 max-w-xs truncate font-medium" title={issue.summary}>
                {issue.summary}
              </td>
              <td className="py-3 px-4 text-gray-600 font-medium">{issue.status}</td>
              <td className="py-3 px-4 text-gray-600 font-medium">{issue.assignee}</td>
              {showResponsePlan && (
                <td className="py-3 px-4 text-gray-700 max-w-md">
                  {issue.responsePlan ? (
                    <span title={issue.responsePlan}>{truncate(issue.responsePlan.replace(/\n/g, ' '), 120)}</span>
                  ) : (
                    <span className="text-lg-red text-xs font-semibold">Description 미입력</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
