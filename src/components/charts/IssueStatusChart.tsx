import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { IssueDistribution } from '../../types/jira'
import { CHART } from '../../theme/colors'

interface Props {
  data: IssueDistribution[]
}

/** Jira 상태명 정규화 — 공백·대소문자 차이 흡수 */
function normStatus(status: string): string {
  return (status || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * 실제 Jira 7개 상태 고정 색 (정규화된 키).
 * Open=주황 · SOC DEVELOP=파랑 · SoC Review=보라 · Closed=회색 ·
 * Reopened=진한빨강 · SOC DELIVERED=녹색 · Developer Draft=청록
 */
const EXACT_STATUS_COLORS: Record<string, string> = {
  open: '#EA580C',
  'soc develop': '#2563EB',
  'soc review': '#7C3AED',
  closed: '#6B7280',
  reopened: '#B91C1C',
  'soc delivered': '#059669',
  'developer draft': '#0891B2',
}

const FALLBACK_PALETTE = ['#DB2777', '#CA8A04', '#0D9488', '#4F46E5', '#9333EA', '#0369A1', '#65A30D']

function resolveStatusColor(status: string, fallbackIdx: number): string {
  const key = normStatus(status)
  if (EXACT_STATUS_COLORS[key]) return EXACT_STATUS_COLORS[key]

  // 부분 일치 fallback (표기 변형 대비)
  if (key.includes('reopen')) return EXACT_STATUS_COLORS.reopened
  if (key.includes('draft')) return EXACT_STATUS_COLORS['developer draft']
  if (key.includes('develop')) return EXACT_STATUS_COLORS['soc develop']
  if (key.includes('review')) return EXACT_STATUS_COLORS['soc review']
  if (key.includes('deliver')) return EXACT_STATUS_COLORS['soc delivered']
  if (key.includes('close')) return EXACT_STATUS_COLORS.closed
  if (key.includes('open')) return EXACT_STATUS_COLORS.open

  return FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length]
}

export default function IssueStatusChart({ data }: Props) {
  const safeData = Array.isArray(data) ? data : []
  const total = safeData.reduce((s, d) => s + (d.count ?? 0), 0)

  let fallbackIdx = 0
  const chartData = safeData.map((entry) => {
    const fill = resolveStatusColor(entry.status, fallbackIdx)
    if (!EXACT_STATUS_COLORS[normStatus(entry.status)] && !normStatus(entry.status).match(/reopen|draft|develop|review|deliver|close|open/)) {
      fallbackIdx += 1
    }
    return { ...entry, fill }
  })

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART.tooltip}
            formatter={(value: number, name: string) => [
              `${value}개 (${total ? Math.round((value / total) * 100) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Recharts 기본 Legend는 회색으로만 나오는 경우가 있어 직접 렌더 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2 pb-1">
        {chartData.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs font-semibold text-gray-700">{entry.status}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500 font-medium">총 이슈</p>
      </div>
    </div>
  )
}
