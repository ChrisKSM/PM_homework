const ROWS = [
  ['계층 연계', '나열형 WBS', 'Gate → Sprint → Epic → Story'],
  ['목표', '없음', 'Gate Goal / Sprint Goal'],
  ['완료 기준', '모호', 'Exit Criteria / DoD / AC'],
  ['추적성', '수동 대조', 'Jira 링크 + 매트릭스'],
]

export default function BeforeAfterCard() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-900 uppercase tracking-wider w-24">구분</th>
            <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">개선 전</th>
            <th className="text-left py-2.5 px-3 text-xs font-bold text-lg-red uppercase tracking-wider">개선 후</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, before, after]) => (
            <tr key={label} className="border-b border-surface-muted">
              <td className="py-2.5 px-3 font-semibold text-gray-800">{label}</td>
              <td className="py-2.5 px-3 text-gray-500">{before}</td>
              <td className="py-2.5 px-3 text-gray-900 font-medium">{after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
