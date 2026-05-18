import clsx from 'clsx'
import type { SprintIssue } from '../../types/jira'

interface Props {
  issues: SprintIssue[]
}

const TYPE_STYLES: Record<string, string> = {
  Epic: 'bg-violet-500/15 text-violet-400',
  Story: 'bg-indigo-500/15 text-indigo-400',
  'Sub-task': 'bg-sky-500/15 text-sky-400',
  Bug: 'bg-red-500/15 text-red-400',
  Task: 'bg-slate-600/40 text-slate-300',
}

const STATUS_DOT: Record<string, string> = {
  Done: 'bg-emerald-400',
  'In Progress': 'bg-indigo-400',
  'In Review': 'bg-amber-400',
  'To Do': 'bg-slate-500',
  Blocked: 'bg-red-400',
}

const STATUS_TEXT: Record<string, string> = {
  Done: 'text-emerald-400',
  'In Progress': 'text-indigo-400',
  'In Review': 'text-amber-400',
  'To Do': 'text-slate-400',
  Blocked: 'text-red-400',
}

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'text-red-400',
  High: 'text-orange-400',
  Medium: 'text-amber-400',
  Low: 'text-slate-500',
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
          {issues.map((issue) => (
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
