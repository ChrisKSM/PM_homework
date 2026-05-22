import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { EpicProgress } from '../../types/jira'
import { CHART } from '../../theme/colors'

interface Props {
  data: EpicProgress[]
}

export default function EpicProgressChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.epicName,
    완료: d.done,
    진행중: d.inProgress,
    미시작: d.todo,
    total: d.total,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 16, right: 16, left: -8, bottom: 0 }}
        stackOffset="expand"
        barSize={36}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 600 }}
          axisLine={{ stroke: CHART.grid }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
        />
        <Tooltip
          contentStyle={CHART.tooltip}
          labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
          formatter={(value: number, name: string) => [`${value} Story Points`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.legend, fontWeight: 600, paddingTop: 8 }} />
        <Bar dataKey="완료" stackId="a" fill={CHART.colors.success} radius={[0, 0, 0, 0]} />
        <Bar dataKey="진행중" stackId="a" fill={CHART.colors.info} />
        <Bar dataKey="미시작" stackId="a" fill={CHART.colors.neutral} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
