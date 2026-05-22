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
  // ✅ 무조건 배열 보장
  const safeData = Array.isArray(data) ? data : [];

  // ✅ total도 safeData 기준
  const total = safeData.reduce((s, d) => s + (d.count ?? 0), 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={safeData}  // ✅ 핵심 수정
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="45%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {safeData.map((entry, i) => (
              <Cell
                key={entry.status ?? i}
                fill={STATUS_COLORS[entry.status] ?? '#64748b'}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [
              `${value ?? 0}개 (${
                total > 0 ? Math.round((value / total) * 100) : 0
              }%)`,
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
  );
}
