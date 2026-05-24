import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { QualityAgingBucket, QualityAvgResolveRow } from '../../types/quality'
import { CHART } from '../../theme/colors'

interface AgingBarProps {
  data: QualityAgingBucket[]
  color: string
  subtitle: string
}

export function QualityAgingBarChart({ data, color, subtitle }: AgingBarProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={56}
            tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={CHART.tooltip}
            labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
            formatter={(value: number) => [`${value}건`, '건수']}
          />
          <Bar dataKey="count" name="건수" fill={color} radius={[0, 3, 3, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 font-medium">{subtitle}</p>
    </div>
  )
}

interface AvgPriorityProps {
  data: QualityAvgResolveRow[]
}

export function QualityAvgResolveChart({ data }: AvgPriorityProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
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
          unit="일"
        />
        <Tooltip
          contentStyle={CHART.tooltip}
          labelStyle={{ color: CHART.axisMuted, marginBottom: 4, fontWeight: 600 }}
          formatter={(value: number) => [`${value}일`, '평균 처리']}
        />
        <Bar
          dataKey="days"
          name="평균 처리일"
          fill={CHART.colors.info}
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
