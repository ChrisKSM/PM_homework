import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, subtitle, icon, color = '#00D4FF', progress, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Glow accent */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }} />

        {/* Background icon watermark */}
        <Box sx={{
          position: 'absolute', right: -8, bottom: -8,
          opacity: 0.04, fontSize: '5rem', lineHeight: 1,
        }}>
          {icon}
        </Box>

        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#7BB3D3', letterSpacing: '0.1em' }}>
              {title}
            </Typography>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: `${color}18`,
              border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: color, fontSize: '1.1rem',
            }}>
              {icon}
            </Box>
          </Box>

          <Typography variant="h2" sx={{ color: '#E8F4FD', mb: 0.5, fontWeight: 700 }}>
            {value}
          </Typography>

          {subtitle && (
            <Typography variant="body2" sx={{ color: '#7BB3D3', mb: progress != null ? 1.5 : 0 }}>
              {subtitle}
            </Typography>
          )}

          {progress != null && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(progress, 100)}
                sx={{
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: color, mt: 0.5, display: 'block' }}>
                {progress.toFixed(1)}% complete
              </Typography>
            </Box>
          )}

          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography variant="caption" sx={{
                color: trend > 0 ? '#00E676' : '#FF4569', fontWeight: 600,
              }}>
                {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#7BB3D3' }}>vs last sprint</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
