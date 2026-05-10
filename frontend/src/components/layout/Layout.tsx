import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useDashboardStore } from '../../store/dashboardStore'
import clsx from 'clsx'

export default function Layout() {
  const { sidebarOpen } = useDashboardStore()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <main
        className={clsx(
          'transition-all duration-200 min-h-screen',
          sidebarOpen ? 'ml-60' : 'ml-16'
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
