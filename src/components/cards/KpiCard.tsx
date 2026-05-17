import clsx from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  tone?: Tone
  icon?: ReactNode
  trend?: { value: number; label: string }
}

const TONE_STYLES: Record<Tone, string> = {
  default: 'text-white',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  info: 'text-indigo-400',
}

const TONE_BG: Record<Tone, string> = {
  default: 'bg-slate-700/50',
  success: 'bg-emerald-500/10',
  warning: 'bg-amber-500/10',
  danger: 'bg-red-500/10',
  info: 'bg-indigo-500/10',
}

export default function KpiCard({ label, value, sub, tone = 'default', icon, trend }: KpiCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        {icon && (
          <div className={clsx('p-2 rounded-lg', TONE_BG[tone])}>
            <span className={clsx('flex items-center justify-center', TONE_STYLES[tone])}>
              {icon}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className={clsx('text-3xl font-bold tracking-tight', TONE_STYLES[tone])}>
          {value}
        </p>
        {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
          <span
            className={clsx(
              'text-xs font-medium',
              trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
          <span className="text-slate-500 text-xs">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
