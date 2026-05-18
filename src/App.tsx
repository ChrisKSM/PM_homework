import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ManagerDashboard from './pages/ManagerDashboard'
import DevTeamDashboard from './pages/DevTeamDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/manager" replace />} />
          <Route path="manager" element={<ManagerDashboard />} />
          <Route path="devteam" element={<DevTeamDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
