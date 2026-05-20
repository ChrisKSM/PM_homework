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
        'fixed top-0 right-0 z-10 flex items-center justify-between h-16 px-6 bg-white/95 backdrop-blur border-b border-surface-border transition-all duration-200',
        sidebarOpen ? 'left-60' : 'left-16'
      )}
    >
      <div>
        <h1 className="text-gray-900 font-bold text-base leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-gray-500 text-xs mt-0.5 font-medium">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 hidden sm:block font-medium">
          마지막 업데이트: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-surface-page border border-surface-border transition-colors"
          disabled={refreshing}
        >
          <RefreshCw size={13} className={clsx(refreshing && 'animate-spin')} />
          새로고침
        </button>
      </div>
    </header>
  )
}
