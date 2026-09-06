import { Sparkles, AlertTriangle, ChevronRight, Loader2, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import type { QualityAiAnalysis } from '../../types/quality'

interface Props {
  data: QualityAiAnalysis | null
  loading: boolean
  onGenerate: () => void
}

const SEVERITY_STYLE: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border-red-200',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200',
  Low: 'bg-gray-50 text-gray-500 border-gray-200',
}

export default function QualityAiCard({ data, loading, onGenerate }: Props) {
  if (loading) {
    return (
      <div className="bg-white border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 justify-center py-6">
          <Loader2 size={20} className="text-lg-red animate-spin" />
          <span className="text-sm text-gray-500">AI가 품질 이슈를 분석하고 있습니다...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white border border-surface-border rounded-xl p-6 text-center">
        <Sparkles size={28} className="text-lg-red mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 mb-1">AI 품질 분석</h3>
        <p className="text-xs text-gray-500 mb-4">
          LLM을 활용하여 품질 이슈의 편중 패턴과 개선 방안을 분석합니다
        </p>
        <button
          onClick={onGenerate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-lg-red hover:bg-red-600 text-white transition-colors"
        >
          <Sparkles size={14} />
          AI 분석 실행
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border bg-surface-page">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-lg-red" />
          <span className="text-sm font-semibold text-gray-900">AI 품질 분석</span>
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-[10px] font-bold',
            data.source === 'llm'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          )}>
            {data.source === 'llm' ? 'LLM' : '규칙기반'}
          </span>
        </div>
        <button
          onClick={onGenerate}
          className="text-xs text-lg-red hover:text-red-700 transition-colors flex items-center gap-1"
        >
          <Sparkles size={12} />
          다시 분석
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Executive Summary */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">전체 요약</p>
          <p className="text-sm text-gray-700 leading-relaxed">{data.executive_summary}</p>
        </div>

        {/* Concentration Analysis */}
        <div className="rounded-lg bg-surface-page border border-surface-border p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-lg-red" />
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">이슈 편중 분석</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{data.concentration_analysis}</p>
        </div>

        {/* Risk Patterns */}
        {data.risk_patterns.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              리스크 패턴 ({data.risk_patterns.length})
            </p>
            <div className="space-y-2">
              {data.risk_patterns.map((p, i) => (
                <div key={i} className="rounded-lg border border-surface-border p-3 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className={p.severity === 'High' ? 'text-red-500' : 'text-amber-500'} />
                    <span className="text-sm font-medium text-gray-900">{p.pattern}</span>
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                      SEVERITY_STYLE[p.severity] || SEVERITY_STYLE.Medium
                    )}>
                      {p.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">{p.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvements */}
        {data.improvements.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              개선 권고 ({data.improvements.length})
            </p>
            <div className="space-y-2">
              {data.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-lg-red text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {imp.priority}
                  </span>
                  <div>
                    <p className="text-gray-900 font-medium">{imp.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-start gap-1">
                      <ChevronRight size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                      {imp.expected_impact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prediction */}
        {data.prediction && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">향후 예측</p>
            <p className="text-xs text-indigo-700">{data.prediction}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-gray-400 text-right">
          {data.event} {data.phaseLabel} · 생성: {new Date(data.generated_at).toLocaleString('ko-KR')}
          {data.llmDebug && ` · ${data.llmDebug.phase}`}
        </p>
      </div>
    </div>
  )
}
