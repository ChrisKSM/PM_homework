import clsx from 'clsx'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export default function SectionCard({ title, subtitle, children, className, action }: SectionCardProps) {
  return (
    <div className={clsx('bg-white border border-surface-border rounded-xl', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-muted">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
