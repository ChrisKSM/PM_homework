import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import clsx from 'clsx'
import { useDashboardStore } from '../../store/dashboardStore'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const queryClient = useQueryClient()
  const { sidebarOpen } = useDashboardStore()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries()
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 z-10 flex items-center justify-between h-16 px-6 bg-slate-950/80 backdrop-blur border-b border-slate-800 transition-all duration-200',
        sidebarOpen ? 'left-60' : 'left-16'
      )}
    >
      <div>
        <h1 className="text-white font-semibold text-base leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 hidden sm:block">
          마지막 업데이트: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw size={13} className={clsx(refreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>
    </header>
  )
}
