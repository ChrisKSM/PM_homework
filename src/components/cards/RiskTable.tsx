import clsx from 'clsx'
import type { RiskIssue } from '../../types/jira'

interface Props {
  issues: RiskIssue[]
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  High: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  Medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  Low: 'bg-slate-700/50 text-slate-400 border border-slate-600',
}

const STATUS_STYLES: Record<string, string> = {
  Blocked: 'text-red-400',
  'In Progress': 'text-indigo-400',
  'In Review': 'text-amber-400',
  'To Do': 'text-slate-400',
  Done: 'text-emerald-400',
}

export default function RiskTable({ issues }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">이슈 ID</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">제목</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">담당자</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">상태</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">우선순위</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr
              key={issue.issueKey}
              className={clsx(
                'border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors',
                issue.status === 'Blocked' && 'bg-red-500/5'
              )}
            >
              <td className="py-3 px-4">
                <span className="font-mono text-indigo-400 text-xs">{issue.issueKey}</span>
              </td>
              <td className="py-3 px-4 text-slate-200 max-w-xs truncate">{issue.summary}</td>
              <td className="py-3 px-4 text-slate-300">{issue.assignee}</td>
              <td className="py-3 px-4">
                <span className={clsx('font-medium', STATUS_STYLES[issue.status])}>
                  {issue.status}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_STYLES[issue.priority])}>
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
