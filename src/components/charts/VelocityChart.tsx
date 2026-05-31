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
import type { SprintVelocity } from '../../types/jira'
import { CHART } from '../../theme/colors'

interface Props {
  data: SprintVelocity[]
}

export default function VelocityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="sprintName"
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 600 }}
          axisLine={{ stroke: CHART.grid }}
          tickLine={false}
          tickFormatter={(v: string) => v.replace('Sprint ', 'S')}
        />
        <YAxis
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          unit=" SP"
        />
        <Tooltip
          contentStyle={CHART.tooltip}
          labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
          formatter={(value: number, name: string) => [`${value} SP`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.legend, fontWeight: 600, paddingTop: 8 }} />
        <Bar dataKey="planned" name="스프린트 Story SP" fill={CHART.colors.planned} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="completed" name="Done Story SP" fill={CHART.colors.success} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
