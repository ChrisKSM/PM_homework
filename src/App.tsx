import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ManagerDashboard from './pages/ManagerDashboard'
import DevTeamDashboard from './pages/DevTeamDashboard'
import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'
import QualityDashboardPage from './pages/QualityDashboardPage'
import ProcurementDashboardPage from './pages/ProcurementDashboardPage'
import ReleaseSprintPlanPage from './pages/ReleaseSprintPlanPage'
import RiskDashboardPage from './pages/RiskDashboardPage'
import MrSchedulePage from './pages/mr/MrSchedulePage'
import MrQualityPage from './pages/mr/MrQualityPage'
import MrBuildPlanPage from './pages/mr/MrBuildPlanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/s80c/manager" replace />} />

          {/* S80C Soundbar */}
          <Route path="s80c/manager" element={<ManagerDashboard />} />
          <Route path="s80c/devteam" element={<DevTeamDashboard />} />
          <Route path="s80c/sprint-plan" element={<ReleaseSprintPlanPage />} />
          <Route path="s80c/planning" element={<PlanningTraceabilityPage />} />
          <Route path="s80c/quality" element={<QualityDashboardPage />} />
          <Route path="s80c/procurement" element={<ProcurementDashboardPage />} />
          <Route path="s80c/risk" element={<RiskDashboardPage />} />

          {/* H7/M7/W7 9월 MR */}
          <Route path="h7m7w7/mr-schedule" element={<MrSchedulePage />} />
          <Route path="h7m7w7/quality" element={<MrQualityPage />} />
          <Route path="h7m7w7/build-plan" element={<MrBuildPlanPage />} />

          {/* 하위 호환 — 기존 /manager 등 경로 리다이렉트 */}
          <Route path="manager" element={<Navigate to="/s80c/manager" replace />} />
          <Route path="devteam" element={<Navigate to="/s80c/devteam" replace />} />
          <Route path="sprint-plan" element={<Navigate to="/s80c/sprint-plan" replace />} />
          <Route path="planning" element={<Navigate to="/s80c/planning" replace />} />
          <Route path="quality" element={<Navigate to="/s80c/quality" replace />} />
          <Route path="procurement" element={<Navigate to="/s80c/procurement" replace />} />
          <Route path="risk" element={<Navigate to="/s80c/risk" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
