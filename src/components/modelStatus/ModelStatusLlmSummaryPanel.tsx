import { Sparkles } from 'lucide-react'

export interface ModelStatusLlmSummaryPanelProps {
  modelCode: string
  signalLabel: string
  schedulePct: number
  spPctLabel: string
  prdLabel: string
  issuesLabel: string
  activeEventLabel?: string | null
}

/** LLM 종합 요약 — 데이터 소스 연결 전 UI shell */
export default function ModelStatusLlmSummaryPanel({
  modelCode,
  signalLabel,
  schedulePct,
  spPctLabel,
  prdLabel,
  issuesLabel,
  activeEventLabel,
}: ModelStatusLlmSummaryPanelProps) {
  const chips = [
    { k: '종합 상태', v: signalLabel },
    { k: 'KPI-2 일정', v: `${schedulePct}%` },
    { k: 'KPI-1 SP', v: spPctLabel },
    { k: 'PRD', v: prdLabel },
    { k: '이슈/리스크', v: issuesLabel },
  ]

  return (
    <section
      className="rounded-2xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-slate-50 p-4"
      aria-label="AI 종합 요약 준비"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">AI 종합 요약</h3>
            <p className="text-[10px] text-gray-500">
              {modelCode.replace(/_/g, ' ')} · 종합상태 / KPI / PRD / 이슈 데이터 기반 (LLM 연동 예정)
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 bg-violet-100 px-2 py-1 rounded-md">
          Coming soon
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {chips.map((c) => (
          <span
            key={c.k}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-[10px]"
          >
            <span className="text-gray-500">{c.k}</span>
            <span className="font-semibold text-gray-800">{c.v}</span>
          </span>
        ))}
        {activeEventLabel ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] text-violet-800">
            구간 · {activeEventLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border border-gray-100 bg-white/70 p-3">
        <div className="h-2.5 w-4/5 max-w-md rounded bg-gray-200/80 animate-pulse" />
        <div className="h-2.5 w-full rounded bg-gray-100 animate-pulse" />
        <div className="h-2.5 w-11/12 rounded bg-gray-100 animate-pulse" />
        <p className="text-[10px] text-gray-400 pt-1">
          요약 생성 시 위 KPI·마일스톤·PRD·검증 이슈를 컨텍스트로 전달합니다.
        </p>
      </div>
    </section>
  )
}
