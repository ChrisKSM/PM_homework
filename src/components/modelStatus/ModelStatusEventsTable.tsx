import type { OverviewEvent, OverviewEventKind, OverviewModel } from '../../types/modelScheduleOverview'
import { classifyEventKind, isValidOverviewEvent } from '../../utils/modelScheduleOverviewRows'

function fmtRange(start: string, end: string) {
  const s = start.slice(0, 10)
  const e = (end || start).slice(0, 10)
  return s === e ? s : `${s} ~ ${e}`
}

function eventsByKind(model: OverviewModel, kind: OverviewEventKind): OverviewEvent[] {
  return (model.events ?? [])
    .filter(isValidOverviewEvent)
    .filter((e) => classifyEventKind(e.name, e.kind) === kind)
}

function EventTable({ title, events, tone }: { title: string; events: OverviewEvent[]; tone: 'hw' | 'sw' }) {
  const headBg = tone === 'hw' ? 'bg-gray-100' : 'bg-amber-50'
  return (
    <div className="border border-surface-border rounded-xl bg-white overflow-hidden">
      <div className={`px-4 py-2 border-b border-surface-border ${headBg}`}>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-[11px] text-gray-400">등록된 이벤트 없음</p>
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-surface-border text-gray-500">
              <th className="text-left px-4 py-2 font-semibold">Event</th>
              <th className="text-left px-4 py-2 font-semibold">기간</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={`${e.name}-${e.start}-${i}`} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2 font-medium text-gray-800">{e.name}</td>
                <td className="px-4 py-2 text-gray-600">{fmtRange(e.start, e.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function ModelStatusEventsTable({ model }: { model: OverviewModel }) {
  const hw = eventsByKind(model, 'hw')
  const sw = eventsByKind(model, 'sw')
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <EventTable title="HW Event (PrePV / PV / MP / ATS)" events={hw} tone="hw" />
      <EventTable title="SW Event (SIT / FC / QP / SU)" events={sw} tone="sw" />
    </div>
  )
}
