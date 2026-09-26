import { create } from 'zustand'

export interface ProjectConfig {
  id: string
  label: string
  color: string
  nav: { to: string; label: string; icon: string }[]
}

export const PROJECTS: ProjectConfig[] = [
  {
    id: 's80c',
    label: 'S80C Soundbar',
    color: '#A50034',
    nav: [
      { to: '/s80c/manager', label: '책임자 대시보드', icon: 'LayoutDashboard' },
      { to: '/s80c/devteam', label: '개발팀 대시보드', icon: 'Users' },
      { to: '/s80c/sprint-plan', label: '릴리즈/스프린트 계획', icon: 'CalendarRange' },
      { to: '/s80c/planning', label: '계획 추적성', icon: 'GitBranch' },
      { to: '/s80c/quality', label: '품질 이슈', icon: 'ShieldCheck' },
      { to: '/s80c/procurement', label: '조달 KPI', icon: 'Package' },
      { to: '/s80c/risk', label: '리스크 관리', icon: 'ShieldAlert' },
    ],
  },
  {
    id: 'h7m7w7',
    label: 'H7/M7/W7 9월 MR',
    color: '#2563EB',
    nav: [
      { to: '/h7m7w7/mr-schedule', label: 'MR 일정 계획', icon: 'CalendarRange' },
      { to: '/h7m7w7/quality', label: '품질 이슈 현황', icon: 'ShieldCheck' },
      { to: '/h7m7w7/build-plan', label: '버전 빌드 계획', icon: 'Package' },
    ],
  },
]

interface DashboardState {
  selectedProject: string
  setSelectedProject: (project: string) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedProject: 's80c',
  setSelectedProject: (project) => set({ selectedProject: project }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
