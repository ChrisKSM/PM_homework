import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProcurementPipelineRow } from '../../types/procurement'
import { CHART } from '../../theme/colors'

interface Props {
  data: ProcurementPipelineRow[]
}

export default function ProcurementPipelineChart({ data }: Props) {
  const chartData = data.map((row) => ({
    phase: row.phase,
    건수: row.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="phase"
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
        <Bar dataKey="건수" fill={CHART.colors.info} radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}
