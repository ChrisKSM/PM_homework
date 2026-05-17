import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { MemberWorkload } from '../../types/jira'

interface Props {
  data: MemberWorkload[]
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
}

const BAR_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#6366f1', '#818cf8']

export default function WorkloadChart({ data }: Props) {
  const avg = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.storyPoints, 0) / data.length)
    : 0

  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        평균 <span className="text-indigo-400 font-medium">{avg} SP</span>
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit=" SP"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#cbd5e1', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, _name: string, props) => [
              `${value} SP · ${(props.payload as MemberWorkload).issueCount}개 이슈`,
              '담당 작업',
            ]}
          />
          <Bar dataKey="storyPoints" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
