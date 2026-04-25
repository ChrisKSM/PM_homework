import { Box, Typography, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import GlowCard from './GlowCard';

export default function MetricCard({ icon, label, value, sub, progress, color = '#00d4ff', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      style={{ height: '100%' }}
    >
      <GlowCard glowColor={color} animate={false}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: 2,
                background: alpha(color, 0.15),
                border: `1px solid ${alpha(color, 0.3)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: color, flexShrink: 0,
              }}
            >
              {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
                {label}
              </Typography>
              <Typography variant="h4" sx={{ color, fontWeight: 700, lineHeight: 1.1, fontFamily: "'JetBrains Mono', monospace" }}>
                {value}
              </Typography>
            </Box>
          </Box>

          {sub && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {sub}
            </Typography>
          )}

          {progress !== undefined && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(progress, 100)}
                sx={{
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
                  },
                  backgroundColor: alpha(color, 0.1),
                }}
              />
              <Typography variant="caption" sx={{ color, mt: 0.5, display: 'block' }}>
                {progress.toFixed(1)}%
              </Typography>
            </Box>
          )}
        </Box>
      </GlowCard>
    </motion.div>
  );
}
