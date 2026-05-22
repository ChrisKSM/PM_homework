import { LayoutDashboard, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Header from '../components/layout/Header'
import KpiCard from '../components/cards/KpiCard'
import SectionCard from '../components/cards/SectionCard'
import RiskTable from '../components/cards/RiskTable'
import EpicProgressChart from '../components/charts/EpicProgressChart'
import IssueStatusChart from '../components/charts/IssueStatusChart'
import VelocityChart from '../components/charts/VelocityChart'

import { useEffect } from "react";
import axios from "axios";

import {
  useProjectSummary,
  useEpicProgress,
  useIssueDistribution,
  useVelocity,
  useRiskIssues,
} from '../hooks/useJiraData'


function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const API_BASE =
  window.workspace_env?.REACT_APP__API_BASE_URL || "/api";

axios.get(`${API_BASE}/metrics/summary`);

export default function ManagerDashboard() {
  useEffect(() => {
    console.log("🔥 ManagerDashboard mounted");

    axios.get(
      "/api/metrics/summary"
    )
    .then(res => {
      console.log("✅ API OK", res.data);
    })
    .catch(err => {
      console.error("❌ API ERROR", err);
    });
  }, []);

  return <div>Manager Dashboard</div>;
}



