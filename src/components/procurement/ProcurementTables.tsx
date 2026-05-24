import clsx from 'clsx'
import type {
  ProcurementAcceptanceRow,
  ProcurementMonitoringRow,
  ProcurementRequestRow,
  ProcurementScheduleRow,
  ProcurementStatusRow,
} from '../../types/procurement'

function statusTone(status: string): string {
  if (status === '주의' || status === '일부 지연') return 'text-amber-700 bg-amber-50'
  if (status === '완료' || status === '충족') return 'text-emerald-700 bg-emerald-50'
  return 'text-gray-600 bg-gray-50'
}

export function ProcurementStatusTable({ rows }: { rows: ProcurementStatusRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 text-center py-6">해당 조건의 조달 현황이 없습니다.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">품목</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">공급자</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Vendor label</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">계약 label</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">진행</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">산출물</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">리스크</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.item}-${row.vendorLabel}`}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                row.progress === '주의' && 'bg-amber-50/50'
              )}
            >
              <td className="py-3 px-4 font-medium text-gray-800">{row.item}</td>
              <td className="py-3 px-4 text-gray-600">{row.vendor}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-500">{row.vendorLabel}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-700">{row.contractLabel}</td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', statusTone(row.progress))}>
                  {row.progress}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-600">{row.deliverable}</td>
              <td className="py-3 px-4 text-gray-600 max-w-[140px] truncate">{row.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProcurementScheduleTable({ rows }: { rows: ProcurementScheduleRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">품목</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">시작</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">종료</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">마일스톤</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">현재</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.item}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                row.status === '주의' && 'bg-amber-50/50'
              )}
            >
              <td className="py-3 px-4 font-medium text-gray-800">{row.item}</td>
              <td className="py-3 px-4 text-gray-600">{row.start}</td>
              <td className="py-3 px-4 text-gray-600">{row.end}</td>
              <td className="py-3 px-4 text-gray-600">{row.milestone}</td>
              <td className="py-3 px-4 text-gray-600">{row.current}</td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', statusTone(row.status))}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProcurementAcceptanceTable({ rows }: { rows: ProcurementAcceptanceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">품목</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">인도 기준</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">검수 방법</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">목표일</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">검수 Task</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.item}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                row.status === '주의' && 'bg-amber-50/50'
              )}
            >
              <td className="py-3 px-4 font-medium text-gray-800">{row.item}</td>
              <td className="py-3 px-4 text-gray-600 max-w-[160px]">{row.criteria}</td>
              <td className="py-3 px-4 text-gray-600 max-w-[160px]">{row.method}</td>
              <td className="py-3 px-4 text-gray-600">{row.targetDate}</td>
              <td className="py-3 px-4 text-gray-700 font-medium">
                {row.verifiedCount}/{row.totalCount}
              </td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', statusTone(row.status))}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProcurementMonitoringTable({ rows }: { rows: ProcurementMonitoringRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">일자</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">구분</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">판정</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">내용</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Vendor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.date}-${row.category}`}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50'
              )}
            >
              <td className="py-3 px-4 text-gray-700 font-medium">{row.date}</td>
              <td className="py-3 px-4 text-gray-600">{row.category}</td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', statusTone(row.verdict))}>
                  {row.verdict}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-700 max-w-xs">{row.note}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-500">{row.vendor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProcurementRequestTable({ rows }: { rows: ProcurementRequestRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 text-center py-6">해당 조건의 Request가 없습니다.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-surface-border bg-surface-page">
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Key</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">공급자</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Vendor label</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Summary</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Phase label</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Due date</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-gray-900 font-bold text-xs uppercase tracking-wider">건강</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.issueKey}
              className={clsx(
                'border-b border-surface-muted hover:bg-surface-page transition-colors',
                i % 2 === 1 && 'bg-surface-page/50',
                row.health === '주의' && 'bg-amber-50/50'
              )}
            >
              <td className="py-3 px-4">
                {row.issueUrl ? (
                  <a
                    href={row.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-lg-red text-xs font-bold hover:underline"
                  >
                    {row.issueKey}
                  </a>
                ) : (
                  <span className="font-mono text-lg-red text-xs font-bold">{row.issueKey}</span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-600">{row.vendor}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-500">{row.vendorLabel}</td>
              <td className="py-3 px-4 text-gray-700 max-w-xs truncate font-medium">{row.summary}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-700">{row.phaseLabel}</td>
              <td className="py-3 px-4 text-gray-600">{row.dueDate ?? '—'}</td>
              <td className="py-3 px-4 text-gray-600">{row.status}</td>
              <td className="py-3 px-4">
                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', statusTone(row.health))}>
                  {row.health}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
