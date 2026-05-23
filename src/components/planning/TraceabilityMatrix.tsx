import clsx from 'clsx'
import type { ComplianceStatus, TraceabilityRow } from '../../types/planning'

interface Props {
  rows: TraceabilityRow[]
  selectedKey: string | null
  onSelect: (key: string) => void
}

const STATUS_DOT: Record<ComplianceStatus, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-lg-red',
  pending: 'bg-gray-400',
}

export default function TraceabilityMatrix({ rows, selectedKey, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            {['Story', 'Gate', 'Sprint', 'Epic', 'AC', 'DoD', '우선순위 근거', ''].map((h) => (
              <th
                key={h || 'status'}
                className="text-left py-3 px-3 text-xs font-bold text-gray-900 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.issueKey}
              onClick={() => onSelect(row.issueKey)}
              className={clsx(
                'border-b border-surface-muted cursor-pointer transition-colors',
                selectedKey === row.issueKey ? 'bg-lg-red-light/50' : 'hover:bg-surface-page'
              )}
            >
              <td className="py-3 px-3">
                <span className="font-mono text-xs text-lg-red font-bold block">{row.issueKey}</span>
                <span className="text-xs text-gray-600">{row.summary}</span>
              </td>
              <td className="py-3 px-3 text-xs text-gray-700">{row.gate}</td>
              <td className="py-3 px-3 text-xs text-gray-700">{row.sprint}</td>
              <td className="py-3 px-3 text-xs font-mono text-gray-700">{row.epic}</td>
              <td className="py-3 px-3 text-xs font-semibold">{row.acStatus}</td>
              <td className="py-3 px-3 text-xs font-semibold">{row.dodStatus}</td>
              <td className="py-3 px-3 text-xs text-gray-600 max-w-[140px] truncate">
                {row.priorityRationale ?? '—'}
              </td>
              <td className="py-3 px-3">
                <div className={clsx('w-2 h-2 rounded-full', STATUS_DOT[row.status])} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
