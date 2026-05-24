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
import type { QualityPriorityRow } from '../../types/quality'
import { CHART } from '../../theme/colors'

interface Props {
  data: QualityPriorityRow[]
}

export default function QualityPriorityChart({ data }: Props) {
  const chartData = data.map((row) => ({
    priority: row.priority,
    발견: row.discovered,
    처리: row.resolved,
    미결: row.open,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="priority"
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 600 }}
          axisLine={{ stroke: CHART.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={CHART.tooltip}
          labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.legend, fontWeight: 600, paddingTop: 8 }} />
        <Bar dataKey="발견" fill={CHART.colors.neutral} radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="처리" fill={CHART.colors.success} radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="미결" fill={CHART.colors.warning} radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
