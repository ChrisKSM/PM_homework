import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ManagerDashboard from './pages/ManagerDashboard'
import DevTeamDashboard from './pages/DevTeamDashboard'

import React, { useState, useEffect } from "react"; // useEffect, isLoggedIn, userData, loading 관련 import 제거
import axios from "axios";
import { analytics, setConfig } from "dej-sdk";
import { variables } from 'dej-sdk'
import { useNavigate } from 'react-router-dom';
import { config } from './config'



export default function App() {
  const navigate = useNavigate()

  // 상태
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null)
  const [backendUrl, setBackendUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  
  useEffect(() => {
    const init = async () => {
      try {
        // ✅ Publish 기준: Variables 사용
        const apiUrl = await variables.get('API_BASE_URL')
        const env = await variables.get('ENV')   // 예: local / prod

        setApiBaseUrl(apiUrl)

        // ✅ 환경별 backend URL 분기
        if (env === 'local') {
          setBackendUrl(
            'https://workspace.hedej.lge.com/project/pm-prj-db/seokmin-koh/?folder=/workspace/PM_homework/backend'
          )
        } else {
          setBackendUrl('https://sdk-test-for-remove.apps.hedej.lge.com')
        }

        // ✅ health check
        const res = await fetch(`${apiUrl}/health`)
        if (!res.ok) {
          throw new Error('Backend health check failed')
        }
      } catch (err: any) {
        setApiError(err.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // ✅ 로딩 / 에러 처리
  if (loading) return <div>Loading...</div>
  if (apiError) return <div>Error: {apiError}</div>

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

