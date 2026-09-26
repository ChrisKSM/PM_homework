import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ManagerDashboard from './pages/ManagerDashboard'
import DevTeamDashboard from './pages/DevTeamDashboard'
import PlanningTraceabilityPage from './pages/PlanningTraceabilityPage'
import ProcurementDashboardPage from './pages/ProcurementDashboardPage'
import ReleaseSprintPlanPage from './pages/ReleaseSprintPlanPage'
import RiskDashboardPage from './pages/RiskDashboardPage'
import MrQualityPage from './pages/mr/MrQualityPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/manager" replace />} />
          <Route path="manager" element={<ManagerDashboard />} />
          <Route path="devteam" element={<DevTeamDashboard />} />
          <Route path="sprint-plan" element={<ReleaseSprintPlanPage />} />
          <Route path="planning" element={<PlanningTraceabilityPage />} />
          <Route path="quality" element={<MrQualityPage />} />
          <Route path="mr-quality" element={<Navigate to="/quality" replace />} />
          <Route path="procurement" element={<ProcurementDashboardPage />} />
          <Route path="risk" element={<RiskDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
