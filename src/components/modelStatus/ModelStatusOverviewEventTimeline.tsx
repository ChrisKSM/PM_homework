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

export default function ModelStatusOverviewEventTimeline({
  timeline,
  overviewSource,
}: {
  timeline: OverviewEventsTimeline
  overviewSource?: 'mongo' | 'local' | 'mock'
}) {
  const todayLeft = `calc(1rem + (100% - 2rem) * ${timeline.todayRatio})`
  return (
    <div className="relative rounded-2xl border border-surface-border bg-white p-4 overflow-hidden">
      <div className="relative space-y-3 z-10">
        <EventRow label="HW Event (PrePV / PV1 / PV2 / MP / ATS)" bars={timeline.hwBars} tone="hw" />
        <EventRow label="SW Event (SIT1·2·3 / FC1·2·3 / QP1·2 …)" bars={timeline.swBars} tone="sw" />
      </div>
      <div
        className="absolute top-12 bottom-14 w-0.5 bg-violet-600 z-20 pointer-events-none"
        style={{ left: todayLeft }}
        title={`오늘 ${fmtShortDate(timeline.today)}`}
      />
      <div
        className="absolute top-10 z-30 pointer-events-none text-[9px] font-bold text-violet-700 -translate-x-1/2"
        style={{ left: todayLeft }}
      >
        오늘
      </div>
      <p className="text-[10px] text-gray-500 pt-3 mt-1 border-t border-gray-100 relative z-10">
        전 모델 일정(
        {overviewSource === 'mongo'
          ? 'Mongo overview'
          : overviewSource === 'local'
            ? 'localStorage'
            : overviewSource === 'mock'
              ? 'mock seed'
              : 'Mongo overview'}
        ) · {fmtShortDate(timeline.rangeStart)} — {fmtShortDate(timeline.rangeEnd)} ·
        가로=기간 비율 · <span className="text-violet-700 font-medium">보라색 선=오늘</span>
        {timeline.activeEventLabel ? (
          <>
            {' '}
            · 현재: <b>{timeline.activeEventLabel}</b>
          </>
        ) : null}
      </p>
    </div>
  )
}
