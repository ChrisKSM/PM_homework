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

interface Props {
  data: EpicProgress[]
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
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
        margin={{ top: 16, right: 16, left: -16, bottom: 0 }}
        stackOffset="expand"
        barSize={36}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 1]}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          formatter={(value: number, name: string) => [
            `${value} Story Points`,
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
        <Bar dataKey="완료" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
        <Bar dataKey="진행중" stackId="a" fill="#6366f1" />
        <Bar dataKey="미시작" stackId="a" fill="#334155" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
