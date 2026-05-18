import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IssueDistribution } from '../../types/jira'

interface Props {
  data: IssueDistribution[]
}

const STATUS_COLORS: Record<string, string> = {
  Done: '#34d399',
  'In Progress': '#6366f1',
  'In Review': '#f59e0b',
  'To Do': '#64748b',
  Blocked: '#f87171',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
}

export default function IssueStatusChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="45%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? '#64748b'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [
              `${value}개 (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
            formatter={(value) => (
              <span style={{ color: '#cbd5e1' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* 중앙 총계 */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-white">{total}</p>
        <p className="text-xs text-slate-400">총 이슈</p>
      </div>
    </div>
  )
}
