import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { QualityCategoryRow } from '../../types/quality'
import { CHART } from '../../theme/colors'

interface Props {
  data: QualityCategoryRow[]
}

export default function QualityCategoryChart({ data }: Props) {
  const chartData = data.map((row) => ({
    category: row.category,
    건수: row.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="category"
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
          formatter={(value: number) => [`${value}건`, '건수']}
        />
        <Bar dataKey="건수" fill={CHART.colors.lgRed} radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
