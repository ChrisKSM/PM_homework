import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Divider,
  Tab, Tabs, Chip, CircularProgress, Alert,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BugReportIcon from '@mui/icons-material/BugReport';
import { motion, AnimatePresence } from 'framer-motion';

import SprintSelector from '../components/dashboard/SprintSelector';
import StatCard from '../components/common/StatCard';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import WBSTree from '../components/wbs/WBSTree';
import RiskAnalysis from '../components/risk/RiskAnalysis';
import QualityInsights from '../components/quality/QualityInsights';
import { sprintApi, analysisApi } from '../services/api';

const TABS = [
  { label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
  { label: 'WBS Tree', icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'AI Risk Analysis', icon: <WarningAmberIcon fontSize="small" /> },
  { label: 'Quality Insights', icon: <BugReportIcon fontSize="small" /> },
];

export default function DashboardPage() {
  const [tab, setTab] = useState(0);
  const [sprintData, setSprintData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingQuality, setAnalyzingQuality] = useState(false);
  const [error, setError] = useState('');
  const [llmStatus, setLlmStatus] = useState(null);

  useEffect(() => {
    analysisApi.checkLlmHealth()
      .then(setLlmStatus)
      .catch(() => setLlmStatus({ connected: false, error: 'Failed to check LLM status' }));
  }, []);

  const handleSprintSelect = async (sprintId, sprintInfo) => {
    setLoading(true);
    setError('');
    setCurrentSprint(sprintInfo);
    setSelectedBoardId(sprintInfo?.originBoardId || sprintInfo?.boardId || null);
    try {
      const boardId = sprintInfo?.originBoardId || sprintInfo?.boardId || null;
      const data = await sprintApi.getWbs(sprintId, boardId);
      setSprintData(data);
    } catch (e) {
      setError(typeof e === 'string' ? e : e.message || 'Failed to load sprint data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (sprintId, sprintInfo) => {
    setAnalyzing(true);
    setError('');
    try {
      const boardId = sprintInfo?.originBoardId || sprintInfo?.boardId || selectedBoardId;
      const data = await analysisApi.analyze(sprintId, boardId);
      setAnalysisData(data);
      setTab(2);
    } catch (e) {
      setError(typeof e === 'string' ? e : e.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQualityAnalyze = async () => {
    if (!currentSprint) return;
    setAnalyzingQuality(true);
    setError('');
    try {
      const boardId = currentSprint?.originBoardId || currentSprint?.boardId || selectedBoardId;
      const data = await analysisApi.analyzeQuality(currentSprint.id, boardId);
      setQualityData(data);
    } catch (e) {
      setError(typeof e === 'string' ? e : e.message || 'Quality analysis failed');
    } finally {
      setAnalyzingQuality(false);
    }
  };

  const stats = sprintData?.stats;

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
            <Typography variant="h1" sx={{
              background: 'linear-gradient(135deg, #00D4FF, #7B61FF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontWeight: 800,
            }}>
              Sprint Dashboard
            </Typography>
            <Chip
              label="AI Powered"
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #7B61FF30, #00D4FF20)',
                border: '1px solid rgba(123,97,255,0.4)',
                color: '#7B61FF', fontWeight: 700, fontSize: '0.65rem',
              }}
            />
            {llmStatus && (
              <Chip
                label={llmStatus.connected ? `LLM Connected (${llmStatus.response_model || llmStatus.model})` : 'LLM Disconnected'}
                size="small"
                sx={{
                  background: llmStatus.connected ? 'rgba(0,230,118,0.12)' : 'rgba(255,69,105,0.12)',
                  border: `1px solid ${llmStatus.connected ? '#00E67640' : '#FF456940'}`,
                  color: llmStatus.connected ? '#00E676' : '#FF4569',
                  fontWeight: 600, fontSize: '0.6rem',
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
            Jira Cloud · Sprint-based WBS Visualization & AI Risk Analysis
          </Typography>
        </Box>
      </motion.div>

      {/* Sprint Selector */}
      <SprintSelector
        onSprintSelect={handleSprintSelect}
        onAnalyze={handleAnalyze}
        loading={loading}
        analyzing={analyzing}
      />

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, background: 'rgba(255,69,105,0.08)', border: '1px solid rgba(255,69,105,0.2)' }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#00D4FF', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#7BB3D3' }}>Loading sprint data from Jira...</Typography>
          </Box>
        </Box>
      )}

      {/* Main content */}
      {!loading && sprintData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Sprint info banner */}
          {currentSprint && (
            <Box sx={{
              p: 1.5, mb: 2.5, borderRadius: '10px',
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.12)',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <Typography variant="body2" sx={{ color: '#00D4FF', fontWeight: 600 }}>
                {currentSprint.name}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(0,212,255,0.15)' }} />
              <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                {sprintData.total_issues} issues loaded
              </Typography>
              {currentSprint.startDate && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(0,212,255,0.15)' }} />
                  <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                    {new Date(currentSprint.startDate).toLocaleDateString()} →{' '}
                    {currentSprint.endDate ? new Date(currentSprint.endDate).toLocaleDateString() : 'TBD'}
                  </Typography>
                </>
              )}
            </Box>
          )}

          {/* Stat Cards */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                {
                  title: 'Total Issues', value: stats.total, icon: '📋',
                  color: '#00D4FF', subtitle: `${stats.done} done · ${stats.in_progress} in progress`,
                  progress: stats.completion_rate,
                },
                {
                  title: 'Story Points', value: stats.total_story_points,
                  icon: '⚡', color: '#7B61FF',
                  subtitle: `${stats.done_story_points} SP completed`,
                  progress: stats.sp_completion_rate,
                },
                {
                  title: 'Completion Rate', value: `${stats.completion_rate}%`,
                  icon: '✅', color: '#00E676',
                  subtitle: `${stats.done} of ${stats.total} issues done`,
                },
                {
                  title: 'Bugs', value: stats.bugs,
                  icon: '🐛', color: '#FF4569',
                  subtitle: stats.bugs > 3 ? '⚠ High bug count' : 'Under control',
                },
                {
                  title: 'Team Members', value: Object.keys(stats.by_assignee || {}).filter(k => k !== 'Unassigned').length,
                  icon: '👥', color: '#FFB830',
                  subtitle: `${stats.unassigned} unassigned issues`,
                },
                {
                  title: 'Unassigned', value: stats.unassigned,
                  icon: '❓', color: stats.unassigned > 0 ? '#FF8C42' : '#00E676',
                  subtitle: stats.unassigned > 0 ? 'Needs attention' : 'All assigned',
                },
              ].map((card, idx) => (
                <Grid item xs={6} sm={4} md={2} key={card.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                  >
                    <StatCard {...card} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tabs */}
          <Box sx={{ mb: 2.5 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                '& .MuiTabs-indicator': {
                  background: 'linear-gradient(90deg, #00D4FF, #7B61FF)',
                  height: 2,
                },
                '& .MuiTab-root': {
                  color: '#7BB3D3', fontWeight: 600, fontSize: '0.85rem',
                  textTransform: 'none', minHeight: 44,
                  '&.Mui-selected': { color: '#00D4FF' },
                },
              }}
            >
              {TABS.map((t) => (
                <Tab
                  key={t.label}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      {t.icon}{t.label}
                      {t.label === 'AI Risk Analysis' && analysisData && (
                        <Chip label="Ready" size="small" sx={{
                          height: 16, fontSize: '0.6rem', fontWeight: 700,
                          background: 'rgba(0,230,118,0.12)', color: '#00E676',
                        }} />
                      )}
                      {t.label === 'Quality Insights' && qualityData && (
                        <Chip label="Ready" size="small" sx={{
                          height: 16, fontSize: '0.6rem', fontWeight: 700,
                          background: 'rgba(0,230,118,0.12)', color: '#00E676',
                        }} />
                      )}
                    </Box>
                  }
                />
              ))}
            </Tabs>
            <Divider sx={{ borderColor: 'rgba(0,212,255,0.08)' }} />
          </Box>

          {/* Tab Panels */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {tab === 0 && <DashboardCharts stats={stats} />}

              {tab === 1 && (
                <Card>
                  <CardContent sx={{ p: 2.5 }}>
                    <WBSTree wbsTree={sprintData.wbs_tree} stats={stats} />
                  </CardContent>
                </Card>
              )}

              {tab === 2 && (
                <>
                  {analyzing && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress sx={{ color: '#7B61FF', mb: 2 }} />
                        <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
                          AI가 스프린트 데이터를 분석하고 있습니다...
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                          10-30초 정도 소요됩니다
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {!analyzing && analysisData && (
                    <RiskAnalysis analysis={analysisData.analysis} />
                  )}
                  {!analyzing && !analysisData && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="h4" sx={{ color: '#7BB3D3', mb: 1 }}>
                        아직 분석이 실행되지 않았습니다
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
                        상단의 "AI Analyze" 버튼을 클릭하여 AI 리스크 분석을 실행하세요
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {tab === 3 && (
                <QualityInsights
                  qualityData={qualityData?.quality}
                  loading={analyzingQuality}
                  onAnalyze={handleQualityAnalyze}
                  hasSprintData={!!sprintData}
                  llmConnected={llmStatus?.connected}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !sprintData && !error && (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <Typography sx={{ fontSize: '4rem', mb: 2 }}>🚀</Typography>
          <Typography variant="h2" sx={{ color: '#E8F4FD', mb: 1 }}>
            Select a Sprint to Begin
          </Typography>
          <Typography variant="body1" sx={{ color: '#7BB3D3' }}>
            Choose your Jira project, board, and sprint above to visualize WBS and run AI analysis
          </Typography>
        </Box>
      )}
    </Box>
  );
}
