import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IssueDistribution } from '../../types/jira'
import { CHART } from '../../theme/colors'

interface Props {
  data: IssueDistribution[]
}

const STATUS_GREEN = '#059669'
const STATUS_GRAY = '#6B7280'
const STATUS_DARK_RED = '#B91C1C'
const STATUS_ORANGE = '#EA580C'
const STATUS_BLUE = '#2563EB'
const STATUS_PURPLE = '#7C3AED'
const STATUS_TEAL = '#0891B2'

// 지정되지 않은 상태에 순서대로 배정할 구분용 팔레트 (서로 충분히 다른 색)
const FALLBACK_PALETTE = ['#DB2777', '#CA8A04', '#0D9488', '#4F46E5', '#9333EA', '#0369A1', '#65A30D']

/**
 * 지정된 상태만 고정색 반환, 그 외에는 null (→ 팔레트에서 자동 배정).
 * Open=주황 · SOC DEVELOP=파랑 · SoC Review=보라 · Closed=회색 ·
 * Reopened=진한빨강 · SOC DELIVERED=녹색 · Developer Draft=청록
 *
 * ※ 'SoC ~' 상태가 여러 개라 'soc' 단독 매칭 금지. 더 구체적인 키워드를 먼저 검사:
 *   reopen → draft → develop → review → deliver → close → open
 */
function knownStatusColor(status: string): string | null {
  const s = (status || '').toLowerCase()
  if (s.includes('reopen')) return STATUS_DARK_RED            // Reopened
  if (s.includes('draft')) return STATUS_TEAL                // Developer Draft
  if (s.includes('develop')) return STATUS_BLUE              // SOC DEVELOP
  if (s.includes('review')) return STATUS_PURPLE             // SoC Review
  if (s.includes('deliver') || s.includes('done') || s.includes('resolved') || s.includes('완료'))
    return STATUS_GREEN                                      // SOC DELIVERED
  if (s.includes('close')) return STATUS_GRAY                // Closed
  if (s.includes('open') || s.includes('to do') || s.includes('todo') || s.includes('backlog'))
    return STATUS_ORANGE                                     // Open
  if (s.includes('progress')) return STATUS_BLUE
  if (s.includes('block')) return CHART.colors.lgRed
  return null
}

export default function IssueStatusChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0)

  // 지정색이 없는 상태들에 팔레트 색을 겹치지 않게 순서대로 배정
  let paletteIdx = 0
  const colorByStatus = new Map<string, string>()
  for (const entry of data) {
    const known = knownStatusColor(entry.status)
    if (known) {
      colorByStatus.set(entry.status, known)
    } else {
      colorByStatus.set(entry.status, FALLBACK_PALETTE[paletteIdx % FALLBACK_PALETTE.length])
      paletteIdx += 1
    }
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="45%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={colorByStatus.get(entry.status) ?? STATUS_GRAY} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART.tooltip}
            formatter={(value: number, name: string) => [
              `${value}개 (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: CHART.legend, fontWeight: 600 }}
            formatter={(value) => (
              <span style={{ color: CHART.axis }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500 font-medium">총 이슈</p>
      </div>
    </div>
  )
}
