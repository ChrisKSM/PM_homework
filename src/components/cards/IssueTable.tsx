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

const STATUS_DOT: Record<string, string> = {
  Done: 'bg-emerald-500',
  'In Progress': 'bg-blue-500',
  'In Review': 'bg-amber-500',
  'To Do': 'bg-gray-400',
  Blocked: 'bg-lg-red',
}

const STATUS_TEXT: Record<string, string> = {
  Done: 'text-emerald-600',
  'In Progress': 'text-blue-600',
  'In Review': 'text-amber-600',
  'To Do': 'text-gray-500',
  Blocked: 'text-lg-red',
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
          <tr className="border-b border-slate-800">
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider w-28">이슈 ID</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider w-20">유형</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">제목</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider w-24">담당자</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider w-28">상태</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider w-20">우선순위</th>
            <th className="text-right py-3 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider w-16">SP</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(issues) ? issues : []).map((issue) => (
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
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', TYPE_STYLES[issue.issueType] ?? 'bg-slate-700 text-slate-300')}>
                  {issue.issueType}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-200 max-w-xs truncate">{issue.summary}</td>
              <td className="py-3 px-4 text-slate-300 text-xs">{issue.assignee}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[issue.status] ?? 'bg-slate-500')} />
                  <span className={clsx('text-xs font-medium', STATUS_TEXT[issue.status])}>
                    {issue.status}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={clsx('text-xs font-medium', PRIORITY_BADGE[issue.priority])}>
                  {issue.priority}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-slate-300 font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">
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
