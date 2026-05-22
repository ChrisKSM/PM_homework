import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IssueDistribution } from '../../types/jira'
import { CHART } from '../../theme/colors'

interface Props {
  data: IssueDistribution[]
}

const STATUS_COLORS: Record<string, string> = {
  Done: CHART.colors.success,
  'In Progress': CHART.colors.info,
  'In Review': CHART.colors.warning,
  'To Do': CHART.colors.neutral,
  Blocked: CHART.colors.lgRed,
}

export default function IssueStatusChart({ data }: Props) {
  const safeData = Array.isArray(data) ? data : []
  const total = safeData.reduce((s, d) => s + (d.count ?? 0), 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={safeData}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="45%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {safeData.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? CHART.colors.neutral}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART.tooltip}
            formatter={(value: number, name: string) => [
              `${value}개 (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: CHART.legend, fontWeight: 600 }}
            formatter={(value) => (
              <span style={{ color: CHART.axis }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500 font-medium">총 이슈</p>
      </div>
    </div>
  )
}