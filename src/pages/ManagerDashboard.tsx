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


export default function ManagerDashboard() {
  useEffect(() => {
    console.log("🔥 ManagerDashboard mounted");

    axios.get(
      "https://workspace.hedej.lge.com/project/be-audio-test/seokmin-koh/proxy/8000/api/metrics/summary"
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



