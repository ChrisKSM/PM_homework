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
import { CHART } from '../../theme/colors'

interface Props {
  data: MemberWorkload[]
}

const BAR_COLORS = [
  CHART.colors.lgRed,
  CHART.colors.info,
  '#3B82F6',
  '#6366F1',
  CHART.colors.success,
  CHART.colors.warning,
]

export default function WorkloadChart({ data }: Props) {
  const avg = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.storyPoints, 0) / data.length)
    : 0

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 font-medium">
        평균 <span className="text-lg-red font-bold">{avg} SP</span>
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: CHART.axis, fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            unit=" SP"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: CHART.axis, fontSize: 12, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={CHART.tooltip}
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
