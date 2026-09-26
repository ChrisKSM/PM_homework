import {
  Activity, CalendarRange, ChevronDown, GitBranch, LayoutDashboard,
  Menu, Package, ShieldAlert, ShieldCheck, Users, X, Check,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDashboardStore, PROJECTS } from '../../store/dashboardStore'
import type { ProjectConfig } from '../../store/dashboardStore'
import clsx from 'clsx'
import { useState, useRef, useEffect } from 'react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Users,
  CalendarRange,
  GitBranch,
  ShieldCheck,
  Package,
  ShieldAlert,
}

function ProjectSelector() {
  const { selectedProject, setSelectedProject } = useDashboardStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const current = PROJECTS.find((p) => p.id === selectedProject) || PROJECTS[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (project: ProjectConfig) => {
    setSelectedProject(project.id)
    setOpen(false)
    navigate(project.nav[0].to)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-page border border-surface-border hover:border-gray-300 transition-colors"
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
        <span className="text-sm text-gray-700 font-medium truncate flex-1 text-left">
          {current.label}
        </span>
        <ChevronDown size={14} className={clsx('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-surface-border rounded-lg shadow-lg z-50 overflow-hidden">
          {PROJECTS.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelect(project)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left',
                project.id === selectedProject
                  ? 'bg-surface-page font-semibold text-gray-900'
                  : 'text-gray-600 hover:bg-surface-page'
              )}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              <span className="flex-1 truncate">{project.label}</span>
              {project.id === selectedProject && <Check size={14} className="text-lg-red shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, selectedProject } = useDashboardStore()
  const currentProject = PROJECTS.find((p) => p.id === selectedProject) || PROJECTS[0]

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
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
            <Activity size={16} className="text-white" />
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

        {/* Project Selector */}
        {sidebarOpen && (
          <div className="px-3 pt-4 pb-2 shrink-0">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 px-1">
              Project
            </p>
            <ProjectSelector />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
          {!sidebarOpen && <p className="sr-only">Navigation collapsed</p>}
          {sidebarOpen && (
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 px-1">
              Dashboards
            </p>
          )}
          {currentProject.nav.map(({ to, icon, label }) => {
            const Icon = ICON_MAP[icon] || LayoutDashboard
            return (
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
            )
          })}
        </nav>

        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-surface-border shrink-0">
            <p className="text-xs text-gray-400 font-medium">v1.1.0 — Multi-Project</p>
          </div>
        )}
      </aside>
    </>
  )
}
