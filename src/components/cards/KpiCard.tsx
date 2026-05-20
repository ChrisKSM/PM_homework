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

const TONE_BORDER: Record<Tone, string> = {
  default: 'border-t-lg-red',
  success: 'border-t-emerald-600',
  warning: 'border-t-amber-600',
  danger: 'border-t-lg-red',
  info: 'border-t-blue-600',
}

const TONE_TEXT: Record<Tone, string> = {
  default: 'text-lg-red',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-lg-red',
  info: 'text-blue-600',
}

const TONE_BG: Record<Tone, string> = {
  default: 'bg-lg-red-light',
  success: 'bg-emerald-50',
  warning: 'bg-amber-50',
  danger: 'bg-lg-red-light',
  info: 'bg-blue-50',
}

export default function KpiCard({ label, value, sub, tone = 'default', icon, trend }: KpiCardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-surface-border rounded-xl p-5 flex flex-col gap-3 border-t-[3px]',
        TONE_BORDER[tone]
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-gray-600 text-sm font-semibold">{label}</p>
        {icon && (
          <div className={clsx('p-2 rounded-lg', TONE_BG[tone])}>
            <span className={clsx('flex items-center justify-center', TONE_TEXT[tone])}>
              {icon}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className={clsx('text-3xl font-bold tracking-tight', TONE_TEXT[tone])}>
          {value}
        </p>
        {sub && <p className="text-gray-500 text-xs mt-1 font-medium">{sub}</p>}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-surface-muted">
          <span
            className={clsx(
              'text-xs font-bold',
              trend.value >= 0 ? 'text-emerald-600' : 'text-lg-red'
            )}
          >
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
          <span className="text-gray-500 text-xs font-medium">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
