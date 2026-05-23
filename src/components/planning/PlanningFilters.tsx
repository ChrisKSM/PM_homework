interface Props {
  gate: string
  sprint: string
  status: string
  gates: { value: string; label: string }[]
  sprints: { value: string; label: string }[]
  loading?: boolean
  useMock?: boolean
  onGateChange: (v: string) => void
  onSprintChange: (v: string) => void
  onStatusChange: (v: string) => void
}

export default function PlanningFilters({
  gate,
  sprint,
  status,
  gates,
  sprints,
  loading,
  useMock,
  onGateChange,
  onSprintChange,
  onStatusChange,
}: Props) {
  const selectClass =
    'w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-lg-red/20 focus:border-lg-red disabled:opacity-50'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Gate / Release</label>
        <select className={selectClass} value={gate} disabled={loading} onChange={(e) => onGateChange(e.target.value)}>
          <option value="all">전체</option>
          {gates.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Sprint</label>
        <select className={selectClass} value={sprint} disabled={loading} onChange={(e) => onSprintChange(e.target.value)}>
          <option value="all">전체</option>
          {sprints.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">AC / DoD 상태</label>
        <select className={selectClass} value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">전체</option>
          <option value="ok">충족</option>
          <option value="warn">부분 충족</option>
          <option value="fail">미충족</option>
        </select>
      </div>
      <p className="text-xs text-gray-400 font-medium pt-2 border-t border-surface-muted">
        {useMock ? 'Mock 데이터 모드' : 'Jira API 연동'} · 필터는 매트릭스/트리에 적용
      </p>
    </div>
  )
}
