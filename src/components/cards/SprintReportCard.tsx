import { Sparkles, RefreshCw, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import SectionCard from './SectionCard'
import type { SprintReport } from '../../types/jira'

interface Props {
  report?: SprintReport
  isFetching: boolean
  isError: boolean
  onGenerate: () => void
}

function MetricChip({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'warning' | 'default' }) {
  return (
    <div
      className={clsx(
        'px-3 py-1.5 rounded-lg border text-xs font-semibold',
        tone === 'danger'
          ? 'bg-red-50 border-red-200 text-lg-red'
          : tone === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-surface-page border-surface-border text-gray-700',
      )}
    >
      <span className="text-gray-500 font-medium">{label}</span>{' '}
      <span>{value}</span>
    </div>
  )
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', { hour12: false })
  } catch {
    return ''
  }
}

export default function SprintReportCard({ report, isFetching, isError, onGenerate }: Props) {
  const action = (
    <button
      type="button"
      onClick={onGenerate}
      disabled={isFetching}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lg-red text-white text-xs font-bold hover:bg-lg-red/90 disabled:opacity-60 transition-colors"
    >
      {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
      {report ? '다시 생성' : '요약 생성'}
    </button>
  )

  return (
    <SectionCard
      title="이번 주차 스프린트 요약"
      subtitle="번다운·완료율·Velocity·블로커 지표 기반 AI 브리핑 및 리스크 점검"
      action={action}
    >
      {isFetching ? (
        <div className="flex items-center justify-center h-28 text-gray-500 text-sm gap-2">
          <Loader2 size={18} className="animate-spin" /> 요약 생성 중…
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm text-lg-red py-4">
          <AlertTriangle size={16} /> 요약 생성에 실패했어요. 잠시 후 다시 시도해 주세요.
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center justify-center h-28 text-center gap-2">
          <Sparkles size={20} className="text-lg-red" />
          <p className="text-sm text-gray-600 font-medium">
            상단의 <span className="font-bold">요약 생성</span> 버튼을 누르면 이번 주차 보고를 만들어 드려요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 요약 문단 */}
          <div className="flex items-start gap-2">
            <Sparkles size={16} className="text-lg-red mt-0.5 shrink-0" />
            <p className="text-sm text-gray-800 leading-relaxed font-medium">{report.summary}</p>
          </div>

          {/* 지표 칩 */}
          <div className="flex flex-wrap gap-2">
            <MetricChip label="완료율" value={`${report.metrics.completionRate}%`} />
            <MetricChip label="잔여" value={`${report.metrics.remainingPoints} SP`} />
            <MetricChip label="D-" value={`${report.metrics.daysLeft}`} />
            <MetricChip
              label="번다운 갭"
              value={`${report.metrics.burndownGap > 0 ? '+' : ''}${report.metrics.burndownGap} SP`}
              tone={report.metrics.burndownGap > 0 ? 'warning' : 'default'}
            />
            <MetricChip
              label="블로커"
              value={`${report.metrics.blockerCount}건`}
              tone={report.metrics.blockerCount > 0 ? 'danger' : 'default'}
            />
            <MetricChip label="Velocity" value={report.metrics.velocityTrend} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 리스크 */}
            <div className="rounded-lg border border-red-100 bg-red-50/40 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-lg-red mb-2">
                <AlertTriangle size={13} /> 리스크
              </p>
              <ul className="space-y-1.5">
                {report.risks.map((r, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                    <span className="text-lg-red">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 권고 */}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-2">
                <Lightbulb size={13} /> 권고
              </p>
              <ul className="space-y-1.5">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                    <span className="text-emerald-600">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 푸터: 출처 + 생성 시각 */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
              <span>
                {report.source === 'llm' ? 'AI 생성 (LLM)' : '규칙기반 요약 (LLM 미연결)'}
              </span>
              <span>생성 {fmtTime(report.generatedAt)}</span>
            </div>
            {report.llmDebug && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
                <p className="font-bold mb-1">LLM 디버그 ({report.llmDebug.phase})</p>
                <p className="font-medium break-all">{report.llmDebug.reason}</p>
                {report.llmDebug.checks?.map((c) => (
                  <p key={c.id} className="mt-1">
                    {c.ok ? '✓' : '✗'} {c.id}: {c.detail}
                  </p>
                ))}
                {report.llmDebug.rawPreview && (
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] opacity-80 max-h-24 overflow-auto">
                    {report.llmDebug.rawPreview}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
