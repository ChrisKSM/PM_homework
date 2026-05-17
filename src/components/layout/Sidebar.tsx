import { LayoutDashboard, Users, Menu, X, Activity } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useDashboardStore } from '../../store/dashboardStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/manager', icon: LayoutDashboard, label: '책임자 대시보드' },
  { to: '/devteam', icon: Users, label: '개발팀 대시보드' },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useDashboardStore()

  return (
    <>
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full z-30 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* 로고 */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
            <Activity size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-white text-sm whitespace-nowrap">
              Jira Dashboard
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
            aria-label="사이드바 토글"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* 프로젝트 선택 */}
        {sidebarOpen && (
          <div className="px-3 pt-4 pb-2 shrink-0">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">
              Project
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
              <span className="text-sm text-slate-200 truncate">PROJ — Sample Project</span>
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
          {!sidebarOpen && (
            <p className="sr-only">Navigation collapsed</p>
          )}
          {sidebarOpen && (
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">
              Dashboards
            </p>
          )}
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 하단 버전 */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-slate-800 shrink-0">
            <p className="text-xs text-slate-600">v1.0.0 — Mock Data Mode</p>
          </div>
        )}
      </aside>
    </>
  )
}
