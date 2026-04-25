import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Divider,
  Tab, Tabs, Chip, CircularProgress, Alert,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TableChartIcon from '@mui/icons-material/TableChart';
import { motion, AnimatePresence } from 'framer-motion';

import SprintSelector from '../components/dashboard/SprintSelector';
import StatCard from '../components/common/StatCard';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import WBSTree from '../components/wbs/WBSTree';
import RiskAnalysis from '../components/risk/RiskAnalysis';
import { sprintApi, analysisApi } from '../services/api';

const TABS = [
  { label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
  { label: 'WBS Tree', icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'AI Risk Analysis', icon: <WarningAmberIcon fontSize="small" /> },
];

export default function DashboardPage() {
  const [tab, setTab] = useState(0);
  const [sprintData, setSprintData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleSprintSelect = async (sprintId, sprintInfo) => {
    setLoading(true);
    setError('');
    setCurrentSprint(sprintInfo);
    try {
      const data = await sprintApi.getWbs(sprintId);
      setSprintData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (sprintId, sprintInfo) => {
    setAnalyzing(true);
    setError('');
    try {
      const data = await analysisApi.analyzeRisks(sprintId, sprintInfo || {});
      setAnalysisData(data);
      setTab(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
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
          </Box>
          <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
            Jira Cloud · Sprint-based WBS Visualization & GPT-4o Risk Analysis
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
                📋 {currentSprint.name}
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
              {TABS.map((t, i) => (
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
                          GPT-4o is analyzing your sprint data...
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                          This may take 10-30 seconds
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {!analyzing && analysisData && (
                    <RiskAnalysis analysis={analysisData.ai_analysis} />
                  )}
                  {!analyzing && !analysisData && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="h4" sx={{ color: '#7BB3D3', mb: 1 }}>
                        No analysis yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
                        Click "AI Analyze" to run GPT-4o risk analysis on this sprint
                      </Typography>
                    </Box>
                  )}
                </>
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
