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
  // ✅ 핵심: 반드시 배열 보장
  const safeData = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />

        <XAxis
          dataKey="sprintName"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          tickFormatter={(v: string) => (v ? v.replace('Sprint ', 'S') : '')}
        />

        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit=" SP"
        />

        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          formatter={(value: number, name: string) => [`${value ?? 0} SP`, name]}
        />

        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />

        <Bar
          dataKey="planned"
          name="계획"
          fill="#4338ca"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />

        <Bar
          dataKey="completed"
          name="완료"
          fill="#34d399"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
