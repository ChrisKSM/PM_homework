import clsx from 'clsx'
import type { OverviewEventsTimeline } from '../../utils/modelStatusMilestones'
import { fmtShortDate } from '../../utils/modelStatusMilestones'

function EventRow({
  label,
  bars,
  tone,
}: {
  label: string
  bars: OverviewEventsTimeline['hwBars']
  tone: 'hw' | 'sw'
}) {
  const barClass =
    tone === 'hw'
      ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-gray-500 px-0.5">{label}</div>
      <div className="relative h-11 rounded-lg bg-gray-100/80 border border-gray-200 overflow-hidden">
        {bars.length === 0 ? (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">—</span>
        ) : (
          bars.map((bar) => (
            <div
              key={`${bar.kind}-${bar.name}-${bar.start.toISOString()}`}
              className={clsx(
                'absolute top-1 bottom-1 rounded-md px-1 flex flex-col justify-center overflow-hidden shadow-sm min-w-[28px]',
                barClass,
              )}
              style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
              title={`${bar.name} · ${fmtShortDate(bar.start)} — ${fmtShortDate(bar.end)}`}
            >
              <span className="text-[9px] font-bold truncate leading-tight">{bar.name}</span>
              <span className="text-[8px] opacity-90 truncate hidden sm:block">
                {fmtShortDate(bar.start)}–{fmtShortDate(bar.end)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function ModelStatusOverviewEventTimeline({ timeline }: { timeline: OverviewEventsTimeline }) {
  return (
    <div className="relative rounded-2xl border border-surface-border bg-white p-4 overflow-hidden space-y-3">
      <EventRow label="HW Event (PrePV / PV1 / PV2 / MP / ATS)" bars={timeline.hwBars} tone="hw" />
      <EventRow label="SW Event (SIT / FC / QP …)" bars={timeline.swBars} tone="sw" />
      <div
        className="absolute top-10 bottom-4 w-0.5 bg-violet-600 z-20 pointer-events-none opacity-90"
        style={{ left: `calc(16px + (100% - 32px) * ${timeline.todayRatio})` }}
        title="오늘"
      />
      <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
        전 모델 일정(Mongo overview) · 가로 위치=일정 기간 비율 ·{' '}
        <span className="text-violet-700 font-medium">| 오늘</span>
        {timeline.activeEventLabel ? (
          <>
            {' '}
            · 현재 구간: <b>{timeline.activeEventLabel}</b>
          </>
        ) : null}
      </p>
    </div>
  )
}
