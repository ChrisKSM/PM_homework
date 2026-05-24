import { GitBranch, LayoutDashboard, Package, ShieldCheck, Users, Menu, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useDashboardStore } from '../../store/dashboardStore'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/manager', icon: LayoutDashboard, label: '책임자 대시보드' },
  { to: '/devteam', icon: Users, label: '개발팀 대시보드' },
  { to: '/planning', icon: GitBranch, label: '계획 추적성' },
  { to: '/quality', icon: ShieldCheck, label: '품질 이슈' },
  { to: '/procurement', icon: Package, label: '조달 KPI' },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useDashboardStore()

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full z-30 flex flex-col bg-white border-r border-surface-border transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-lg-red shrink-0">
            <span className="text-white text-xs font-black tracking-tight">LG</span>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <span className="font-bold text-gray-900 text-sm whitespace-nowrap block">
                Jira Dashboard
              </span>
              <span className="text-[10px] text-gray-500 font-medium">PM Insights</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="ml-auto text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="사이드바 토글"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {sidebarOpen && (
          <div className="px-3 pt-4 pb-2 shrink-0">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 px-1">
              Project
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-page border border-surface-border">
              <div className="w-2 h-2 rounded-full bg-lg-red shrink-0" />
              <span className="text-sm text-gray-700 font-medium truncate">PROJ — Sample Project</span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
          {!sidebarOpen && <p className="sr-only">Navigation collapsed</p>}
          {sidebarOpen && (
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 px-1">
              Dashboards
            </p>
          )}
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-[3px]',
                  isActive
                    ? 'bg-lg-red-light text-lg-red border-lg-red'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-surface-page border-transparent'
                )
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-surface-border shrink-0">
            <p className="text-xs text-gray-400 font-medium">v1.0.0 — Mock Data Mode</p>
          </div>
        )}
      </aside>
    </>
  )
}
