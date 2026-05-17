import { create } from 'zustand'

interface DashboardState {
  selectedProject: string
  setSelectedProject: (project: string) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedProject: 'PROJ',
  setSelectedProject: (project) => set({ selectedProject: project }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
