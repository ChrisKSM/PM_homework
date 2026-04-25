import React, { useState } from 'react';
import {
  Box, Typography, Chip, Card, CardContent, Grid, Accordion,
  AccordionSummary, AccordionDetails, LinearProgress, Alert, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { motion } from 'framer-motion';

const SEVERITY_CONFIG = {
  Critical: { color: '#FF4569', bg: 'rgba(255,69,105,0.1)', icon: <ErrorIcon fontSize="small" /> },
  High:     { color: '#FF8C42', bg: 'rgba(255,140,66,0.1)', icon: <WarningAmberIcon fontSize="small" /> },
  Medium:   { color: '#FFB830', bg: 'rgba(255,184,48,0.1)', icon: <WarningAmberIcon fontSize="small" /> },
  Low:      { color: '#00D4FF', bg: 'rgba(0,212,255,0.08)', icon: <InfoIcon fontSize="small" /> },
};

const HEALTH_CONFIG = {
  Green:  { color: '#00E676', label: 'Healthy', icon: <CheckCircleIcon /> },
  Yellow: { color: '#FFB830', label: 'At Risk', icon: <WarningAmberIcon /> },
  Red:    { color: '#FF4569', label: 'Critical', icon: <ErrorIcon /> },
};

const CATEGORY_COLORS = {
  Schedule: '#FF4569', Resource: '#FFB830', Quality: '#7B61FF',
  Scope: '#00D4FF', Technical: '#00E676',
};

function HealthGauge({ score, health }) {
  const cfg = HEALTH_CONFIG[health] || HEALTH_CONFIG.Yellow;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{
        width: 120, height: 120, borderRadius: '50%', mx: 'auto', mb: 1.5,
        background: `conic-gradient(${cfg.color} ${score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: `0 0 30px ${cfg.color}30`,
      }}>
        <Box sx={{
          width: 90, height: 90, borderRadius: '50%',
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
        <Typography variant="h5" sx={{ color: cfg.color }}>{cfg.label}</Typography>
      </Box>
    </Box>
  );
}

function RiskCard({ risk, index }) {
  const cfg = SEVERITY_CONFIG[risk.severity] || SEVERITY_CONFIG.Medium;
  const catColor = CATEGORY_COLORS[risk.category] || '#7BB3D3';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Accordion
        sx={{
          background: cfg.bg,
          border: `1px solid ${cfg.color}25`,
          borderRadius: '10px !important',
          mb: 1,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { border: `1px solid ${cfg.color}50` },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: cfg.color }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
            <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                <Typography variant="caption" sx={{
                  color: '#7BB3D3', fontFamily: 'JetBrains Mono',
                }}>{risk.id}</Typography>
                <Chip label={risk.category} size="small" sx={{
                  height: 16, fontSize: '0.6rem', fontWeight: 700,
                  background: `${catColor}18`, color: catColor,
                  border: `1px solid ${catColor}30`,
                }} />
                <Chip label={`Prob: ${risk.probability}`} size="small" sx={{
                  height: 16, fontSize: '0.6rem',
                  background: 'rgba(255,255,255,0.05)', color: '#7BB3D3',
                }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#E8F4FD', fontWeight: 600 }}>
                {risk.title}
              </Typography>
            </Box>
            <Chip
              label={risk.severity}
              size="small"
              sx={{
                fontWeight: 700, fontSize: '0.7rem',
                background: cfg.bg, color: cfg.color,
                border: `1px solid ${cfg.color}50`,
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Divider sx={{ borderColor: `${cfg.color}15`, mb: 1.5 }} />
          <Typography variant="body2" sx={{ color: '#B0CDE0', mb: 1.5 }}>
            {risk.description}
          </Typography>

          {risk.affected_issues?.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#7BB3D3', display: 'block', mb: 0.5 }}>
                Affected Issues
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {risk.affected_issues.map(k => (
                  <Chip key={k} label={k} size="small" sx={{
                    height: 18, fontSize: '0.65rem', fontFamily: 'JetBrains Mono',
                    background: 'rgba(0,212,255,0.08)', color: '#00D4FF',
                    border: '1px solid rgba(0,212,255,0.2)',
                  }} />
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{
            p: 1.5, borderRadius: '8px',
            background: 'rgba(0,230,118,0.06)',
            border: '1px solid rgba(0,230,118,0.15)',
          }}>
            <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 600, display: 'block', mb: 0.3 }}>
              💡 Mitigation
            </Typography>
            <Typography variant="body2" sx={{ color: '#B0CDE0' }}>
              {risk.mitigation}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    </motion.div>
  );
}

export default function RiskAnalysis({ analysis }) {
  if (!analysis) return null;

  const { summary, risks = [], recommendations = [], team_insights = {}, sprint_forecast = {} } = analysis;
  const healthCfg = HEALTH_CONFIG[summary?.overall_health] || HEALTH_CONFIG.Yellow;

  const criticalCount = risks.filter(r => r.severity === 'Critical').length;
  const highCount = risks.filter(r => r.severity === 'High').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AutoAwesomeIcon sx={{ color: '#7B61FF' }} />
        <Typography variant="h3" sx={{ color: '#E8F4FD' }}>AI Risk Analysis</Typography>
        <Chip label="GPT-4o" size="small" sx={{
          background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
          color: '#fff', fontWeight: 700, fontSize: '0.65rem',
        }} />
      </Box>

      <Grid container spacing={2.5}>
        {/* Health Score */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="overline" sx={{ color: '#7BB3D3', display: 'block', mb: 2 }}>
                Sprint Health Score
              </Typography>
              <HealthGauge score={summary?.health_score || 0} health={summary?.overall_health} />
              <Divider sx={{ my: 2, borderColor: 'rgba(0,212,255,0.08)' }} />
              <Typography variant="body2" sx={{ color: '#B0CDE0', fontStyle: 'italic' }}>
                "{summary?.key_insight}"
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Forecast */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="overline" sx={{ color: '#7BB3D3', display: 'block', mb: 2 }}>
                Sprint Forecast
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#7BB3D3' }}>Completion Probability</Typography>
                  <Typography variant="body2" sx={{ color: '#00D4FF', fontWeight: 700 }}>
                    {sprint_forecast.completion_probability || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={sprint_forecast.completion_probability || 0}
                  sx={{
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(90deg, #00D4FF80, #00D4FF)`,
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#7BB3D3', display: 'block', mb: 0.3 }}>
                  Expected Velocity
                </Typography>
                <Typography variant="h3" sx={{ color: '#E8F4FD', fontWeight: 700 }}>
                  {sprint_forecast.expected_velocity || '—'} <Typography component="span" variant="caption" sx={{ color: '#7BB3D3' }}>SP</Typography>
                </Typography>
              </Box>

              {sprint_forecast.concern_areas?.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#7BB3D3', display: 'block', mb: 0.5 }}>
                    Concern Areas
                  </Typography>
                  {sprint_forecast.concern_areas.map((c, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.3 }}>
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#FFB830', mt: 0.7, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: '#B0CDE0' }}>{c}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="overline" sx={{ color: '#7BB3D3', display: 'block', mb: 2 }}>
                Risk Summary
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  { label: 'Critical', count: criticalCount, color: '#FF4569' },
                  { label: 'High', count: highCount, color: '#FF8C42' },
                  { label: 'Medium', count: risks.filter(r => r.severity === 'Medium').length, color: '#FFB830' },
                  { label: 'Low', count: risks.filter(r => r.severity === 'Low').length, color: '#00D4FF' },
                ].map(item => (
                  <Grid item xs={6} key={item.label}>
                    <Box sx={{
                      p: 1.5, borderRadius: '8px',
                      background: `${item.color}0D`,
                      border: `1px solid ${item.color}20`,
                      textAlign: 'center',
                    }}>
                      <Typography variant="h3" sx={{ color: item.color, fontWeight: 700 }}>
                        {item.count}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7BB3D3' }}>{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {team_insights.bottlenecks?.length > 0 && (
                <Alert
                  severity="warning"
                  icon={false}
                  sx={{
                    background: 'rgba(255,184,48,0.08)',
                    border: '1px solid rgba(255,184,48,0.2)',
                    borderRadius: '8px', py: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#FFB830', fontWeight: 600, display: 'block', mb: 0.3 }}>
                    Bottlenecks
                  </Typography>
                  {team_insights.bottlenecks.map((b, i) => (
                    <Typography key={i} variant="caption" sx={{ color: '#B0CDE0', display: 'block' }}>• {b}</Typography>
                  ))}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Risk List */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ color: '#E8F4FD', mb: 2 }}>
                Identified Risks ({risks.length})
              </Typography>
              {risks.map((risk, idx) => (
                <RiskCard key={risk.id} risk={risk} index={idx} />
              ))}
              {risks.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon sx={{ color: '#00E676', fontSize: 40, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: '#7BB3D3' }}>No risks identified</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LightbulbIcon sx={{ color: '#FFB830', fontSize: 18 }} />
                <Typography variant="h5" sx={{ color: '#E8F4FD' }}>Recommendations</Typography>
              </Box>
              {recommendations.map((rec, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Box sx={{
                    p: 1.5, borderRadius: '8px', mb: 1.5,
                    background: 'rgba(123,97,255,0.06)',
                    border: '1px solid rgba(123,97,255,0.15)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                      <Box sx={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Typography sx={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>
                          {rec.priority}
                        </Typography>
                      </Box>
                      <Chip
                        label={rec.impact}
                        size="small"
                        sx={{
                          height: 16, fontSize: '0.6rem', fontWeight: 700,
                          background: rec.impact === 'High' ? 'rgba(255,69,105,0.1)' : 'rgba(0,212,255,0.08)',
                          color: rec.impact === 'High' ? '#FF4569' : '#00D4FF',
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#E8F4FD', fontWeight: 600, mb: 0.3 }}>
                      {rec.action}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                      {rec.rationale}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
