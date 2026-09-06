import React from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  LinearProgress, CircularProgress, Divider, Alert,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ScienceIcon from '@mui/icons-material/Science';
import { motion } from 'framer-motion';

const GRADE_CONFIG = {
  A: { color: '#00E676', bg: 'rgba(0,230,118,0.1)', label: 'Excellent' },
  B: { color: '#00D4FF', bg: 'rgba(0,212,255,0.1)', label: 'Good' },
  C: { color: '#FFB830', bg: 'rgba(255,184,48,0.1)', label: 'Fair' },
  D: { color: '#FF8C42', bg: 'rgba(255,140,66,0.1)', label: 'Poor' },
  F: { color: '#FF4569', bg: 'rgba(255,69,105,0.1)', label: 'Critical' },
};

const SEVERITY_COLORS = {
  Critical: '#FF4569', High: '#FF8C42', Medium: '#FFB830', Low: '#00D4FF',
};

const EFFORT_COLORS = {
  High: '#FF8C42', Medium: '#FFB830', Low: '#00E676',
};

const CATEGORY_COLORS = {
  Process: '#7B61FF', Testing: '#00D4FF', 'Code Review': '#00E676',
  Architecture: '#FFB830', Monitoring: '#FF8C42',
};

function QualityGauge({ score, grade }) {
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.C;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{
        width: 130, height: 130, borderRadius: '50%', mx: 'auto', mb: 1.5,
        background: `conic-gradient(${cfg.color} ${score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 30px ${cfg.color}30`,
      }}>
        <Box sx={{
          width: 100, height: 100, borderRadius: '50%',
          background: '#0D1B2A',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography variant="h2" sx={{ color: cfg.color, fontWeight: 700, lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography variant="caption" sx={{ color: '#7BB3D3' }}>/ 100</Typography>
        </Box>
      </Box>
      <Chip
        label={`Grade ${grade} · ${cfg.label}`}
        sx={{
          background: cfg.bg,
          color: cfg.color,
          fontWeight: 700,
          border: `1px solid ${cfg.color}40`,
        }}
      />
    </Box>
  );
}

function HotspotCard({ hotspot, index }) {
  const sevColor = SEVERITY_COLORS[hotspot.severity] || '#7BB3D3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Box sx={{
        p: 2, borderRadius: '10px', mb: 1.5,
        background: `${sevColor}08`,
        border: `1px solid ${sevColor}20`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <WarningAmberIcon sx={{ color: sevColor, fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: '#E8F4FD', fontWeight: 600, flex: 1 }}>
            {hotspot.area}
          </Typography>
          <Chip
            label={hotspot.severity}
            size="small"
            sx={{
              fontWeight: 700, fontSize: '0.65rem',
              background: `${sevColor}15`, color: sevColor,
              border: `1px solid ${sevColor}40`,
            }}
          />
          {hotspot.issue_count != null && (
            <Chip
              label={`${hotspot.issue_count} issues`}
              size="small"
              sx={{
                fontWeight: 600, fontSize: '0.6rem',
                background: 'rgba(255,255,255,0.05)', color: '#7BB3D3',
              }}
            />
          )}
        </Box>
        <Typography variant="caption" sx={{ color: '#B0CDE0' }}>
          {hotspot.description}
        </Typography>
      </Box>
    </motion.div>
  );
}

export default function QualityInsights({ qualityData, loading, onAnalyze, hasSprintData, llmConnected }) {
  if (!hasSprintData) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ color: '#7BB3D3', mb: 1 }}>
          스프린트를 먼저 선택하세요
        </Typography>
        <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
          품질 분석을 실행하려면 먼저 스프린트 데이터를 로드해야 합니다
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#7B61FF', mb: 2 }} />
          <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
            AI가 품질 이슈를 분석하고 있습니다...
          </Typography>
          <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
            이슈 패턴 및 품질 지표를 분석 중입니다
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!qualityData) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <ScienceIcon sx={{ fontSize: 48, color: '#7B61FF', mb: 2 }} />
        <Typography variant="h4" sx={{ color: '#E8F4FD', mb: 1 }}>
          Quality Insights
        </Typography>
        <Typography variant="body2" sx={{ color: '#7BB3D3', mb: 3 }}>
          AI를 사용하여 이슈 패턴을 분석하고 품질 개선 방안을 도출합니다
        </Typography>
        <Button
          variant="contained"
          onClick={onAnalyze}
          disabled={!llmConnected}
          startIcon={<AutoAwesomeIcon />}
          sx={{
            background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
            color: '#fff', fontWeight: 700, px: 4, py: 1.2,
            '&:hover': { boxShadow: '0 4px 20px rgba(123,97,255,0.4)' },
          }}
        >
          품질 분석 실행
        </Button>
        {!llmConnected && (
          <Typography variant="caption" sx={{ color: '#FF4569', display: 'block', mt: 1 }}>
            LLM이 연결되지 않았습니다. API 키를 설정해주세요.
          </Typography>
        )}
      </Box>
    );
  }

  const {
    quality_score = 0, quality_grade = 'C', executive_summary = '',
    issue_distribution = {}, root_cause_patterns = [],
    improvement_actions = [], testing_gaps = [], trend_analysis = '',
  } = qualityData;

  const gradeCfg = GRADE_CONFIG[quality_grade] || GRADE_CONFIG.C;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <BugReportIcon sx={{ color: '#7B61FF' }} />
        <Typography variant="h3" sx={{ color: '#E8F4FD' }}>Quality Insights</Typography>
        <Chip label="AI Analysis" size="small" sx={{
          background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
          color: '#fff', fontWeight: 700, fontSize: '0.65rem',
        }} />
      </Box>

      <Grid container spacing={2.5}>
        {/* Quality Score */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="overline" sx={{ color: '#7BB3D3', display: 'block', mb: 2 }}>
                Quality Score
              </Typography>
              <QualityGauge score={quality_score} grade={quality_grade} />
              <Divider sx={{ my: 2, borderColor: 'rgba(0,212,255,0.08)' }} />
              <Typography variant="body2" sx={{ color: '#B0CDE0', fontStyle: 'italic', textAlign: 'left' }}>
                {executive_summary}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Issue Distribution */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon sx={{ color: '#00D4FF', fontSize: 18 }} />
                <Typography variant="h5" sx={{ color: '#E8F4FD' }}>이슈 분포 분석</Typography>
              </Box>

              {issue_distribution.description && (
                <Alert
                  severity="info"
                  icon={false}
                  sx={{
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.15)',
                    borderRadius: '8px', mb: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#B0CDE0' }}>
                    {issue_distribution.description}
                  </Typography>
                </Alert>
              )}

              <Typography variant="overline" sx={{ color: '#7BB3D3', display: 'block', mb: 1 }}>
                Hotspots
              </Typography>
              {(issue_distribution.hotspots || []).map((h, idx) => (
                <HotspotCard key={idx} hotspot={h} index={idx} />
              ))}
              {(!issue_distribution.hotspots || issue_distribution.hotspots.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircleIcon sx={{ color: '#00E676', fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#7BB3D3' }}>특이한 편중 패턴이 발견되지 않았습니다</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Root Cause Patterns */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ color: '#E8F4FD', mb: 2 }}>
                근본 원인 패턴 ({root_cause_patterns.length})
              </Typography>
              {root_cause_patterns.map((pattern, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Box sx={{
                    p: 2, borderRadius: '10px', mb: 1.5,
                    background: 'rgba(123,97,255,0.06)',
                    border: '1px solid rgba(123,97,255,0.15)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#E8F4FD', fontWeight: 600, flex: 1 }}>
                        {pattern.pattern}
                      </Typography>
                      <Chip
                        label={pattern.frequency}
                        size="small"
                        sx={{
                          fontWeight: 700, fontSize: '0.6rem',
                          background: pattern.frequency === 'High' ? 'rgba(255,69,105,0.1)' : 'rgba(0,212,255,0.08)',
                          color: pattern.frequency === 'High' ? '#FF4569' : '#00D4FF',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#B0CDE0', display: 'block', mb: 1 }}>
                      {pattern.description}
                    </Typography>
                    {pattern.affected_issues?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {pattern.affected_issues.map(k => (
                          <Chip key={k} label={k} size="small" sx={{
                            height: 18, fontSize: '0.6rem', fontFamily: 'JetBrains Mono',
                            background: 'rgba(0,212,255,0.08)', color: '#00D4FF',
                            border: '1px solid rgba(0,212,255,0.2)',
                          }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </motion.div>
              ))}
              {root_cause_patterns.length === 0 && (
                <Typography variant="body2" sx={{ color: '#7BB3D3', textAlign: 'center', py: 3 }}>
                  근본 원인 패턴이 식별되지 않았습니다
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Improvement Actions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LightbulbIcon sx={{ color: '#FFB830', fontSize: 18 }} />
                <Typography variant="h5" sx={{ color: '#E8F4FD' }}>개선 권장사항</Typography>
              </Box>
              {improvement_actions.map((action, idx) => {
                const catColor = CATEGORY_COLORS[action.category] || '#7BB3D3';
                const effColor = EFFORT_COLORS[action.effort] || '#7BB3D3';
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Box sx={{
                      p: 2, borderRadius: '10px', mb: 1.5,
                      background: 'rgba(255,184,48,0.04)',
                      border: '1px solid rgba(255,184,48,0.12)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                        <Box sx={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Typography sx={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>
                            {action.priority}
                          </Typography>
                        </Box>
                        <Chip label={action.category} size="small" sx={{
                          height: 18, fontSize: '0.6rem', fontWeight: 700,
                          background: `${catColor}15`, color: catColor,
                          border: `1px solid ${catColor}30`,
                        }} />
                        <Chip label={`Effort: ${action.effort}`} size="small" sx={{
                          height: 18, fontSize: '0.6rem',
                          background: `${effColor}15`, color: effColor,
                        }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#E8F4FD', fontWeight: 600, mb: 0.3 }}>
                        {action.action}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#B0CDE0' }}>
                        {action.expected_impact}
                      </Typography>
                    </Box>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Testing Gaps */}
        {testing_gaps.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ScienceIcon sx={{ color: '#00D4FF', fontSize: 18 }} />
                  <Typography variant="h5" sx={{ color: '#E8F4FD' }}>테스트 커버리지 Gap</Typography>
                </Box>
                {testing_gaps.map((gap, idx) => (
                  <Box key={idx} sx={{
                    p: 2, borderRadius: '10px', mb: 1.5,
                    background: 'rgba(0,212,255,0.04)',
                    border: '1px solid rgba(0,212,255,0.12)',
                  }}>
                    <Typography variant="body2" sx={{ color: '#FF8C42', fontWeight: 600, mb: 0.5 }}>
                      {gap.area}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B0CDE0' }}>
                      {gap.recommendation}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Trend Analysis */}
        {trend_analysis && (
          <Grid item xs={12} md={testing_gaps.length > 0 ? 6 : 12}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon sx={{ color: '#00E676', fontSize: 18 }} />
                  <Typography variant="h5" sx={{ color: '#E8F4FD' }}>품질 추세 분석</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#B0CDE0', lineHeight: 1.8 }}>
                  {trend_analysis}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Re-analyze button */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Button
              variant="outlined"
              onClick={onAnalyze}
              startIcon={<AutoAwesomeIcon />}
              sx={{
                borderColor: 'rgba(123,97,255,0.3)', color: '#7B61FF',
                '&:hover': { borderColor: '#7B61FF', background: 'rgba(123,97,255,0.06)' },
              }}
            >
              품질 분석 다시 실행
            </Button>
            {qualityData.generated_at && (
              <Typography variant="caption" sx={{ color: '#7BB3D3', display: 'block', mt: 0.5 }}>
                분석 시각: {new Date(qualityData.generated_at).toLocaleString('ko-KR')}
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
