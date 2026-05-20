import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { BurndownData } from '../../types/jira'
import { CHART } from '../../theme/colors'

interface Props {
  data: BurndownData
}

export default function BurndownChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data.points} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
        <XAxis
          dataKey="day"
          tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 600 }}
          axisLine={{ stroke: CHART.grid }}
          tickLine={false}
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
        <ReferenceLine y={0} stroke={CHART.grid} />
        <Line
          type="monotone"
          dataKey="ideal"
          name="이상적 번다운"
          stroke={CHART.colors.ideal}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="실제 번다운"
          stroke={CHART.colors.lgRed}
          strokeWidth={2}
          dot={{ fill: CHART.colors.lgRed, r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
