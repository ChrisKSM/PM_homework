import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RiskEmvTrend } from '../../types/risk'
import { CHART } from '../../theme/colors'

interface Props {
  data: RiskEmvTrend
}

export default function RiskEmvTrendChart({ data }: Props) {
  const chartData = data.categories.map((label, i) => ({
    sprint: label,
    total: data.total[i] ?? 0,
    mitigated: data.mitigated[i] ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
        <XAxis
          dataKey="sprint"
          tick={{ fill: CHART.axis, fontSize: 10, fontWeight: 600 }}
          axisLine={{ stroke: CHART.grid }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          unit="일"
        />
        <Tooltip
          contentStyle={CHART.tooltip}
          labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
          formatter={(value: number) => [`${value}일`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
        <Line
          type="monotone"
          dataKey="total"
          name="총 EMV_일정"
          stroke={CHART.colors.warning}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="mitigated"
          name="대응 감소 누적"
          stroke={CHART.colors.success}
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
