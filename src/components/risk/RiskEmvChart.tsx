import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RiskQuantRow } from '../../types/risk'
import { CHART } from '../../theme/colors'

interface Props {
  data: RiskQuantRow[]
  dataKey: 'emvSchedule' | 'emvEffort' | 'pPct' | 'iSchedule'
  suffix?: string
  color?: string
  labelKey?: 'riskId' | 'category'
}

export default function RiskEmvChart({
  data,
  dataKey,
  suffix = '',
  color = CHART.colors.warning,
  labelKey = 'riskId',
}: Props) {
  const chartData = data.map((row) => ({
    name: row[labelKey],
    value: row[dataKey],
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
          axisLine={{ stroke: CHART.grid }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={52}
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={CHART.tooltip}
          labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
          formatter={(value: number) => [`${value}${suffix}`, '']}
        />
        <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
