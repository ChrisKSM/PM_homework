import Header from '../components/layout/Header'
import ManagerDashboardBody from '../components/modelStatus/ManagerDashboardBody'

export default function ManagerDashboard() {
  return (
    <>
      <Header
        title="조직 책임자 대시보드"
        subtitle="전체 프로젝트 현황 — KPI, Epic 진행률, Velocity, 리스크 관리"
      />
      <div className="pt-16 p-6">
        <ManagerDashboardBody />
      </div>
    </>
  )
}
