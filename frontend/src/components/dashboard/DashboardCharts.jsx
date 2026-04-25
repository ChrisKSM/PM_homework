import React from 'react';
import {
  Box, Card, CardContent, Typography, Grid,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

const COLORS = {
  done: '#00E676', indeterminate: '#00D4FF', new: '#7BB3D3',
  Epic: '#7B61FF', Story: '#00D4FF', Task: '#00E676', Bug: '#FF4569', 'Sub-task': '#FFB830',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: '#0D1B2A', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '8px', p: 1.5,
    }}>
      {label && <Typography variant="caption" sx={{ color: '#7BB3D3', display: 'block', mb: 0.5 }}>{label}</Typography>}
      {payload.map((p, i) => (
        <Typography key={i} variant="caption" sx={{ color: p.color || '#E8F4FD', display: 'block' }}>
          {p.name}: <strong>{p.value}</strong>
        </Typography>
      ))}
    </Box>
  );
};

export default function DashboardCharts({ stats }) {
  if (!stats) return null;

  const statusData = [
    { name: 'Done', value: stats.done, color: '#00E676' },
    { name: 'In Progress', value: stats.in_progress, color: '#00D4FF' },
    { name: 'To Do', value: stats.todo, color: '#7BB3D3' },
  ].filter(d => d.value > 0);

  const typeData = Object.entries(stats.by_type || {}).map(([name, value]) => ({
    name, value, color: COLORS[name] || '#7BB3D3',
  }));

  const assigneeData = Object.entries(stats.by_assignee || {})
    .map(([name, data]) => ({
      name: name.split(' ')[0],
      total: data.total,
      done: data.done,
      sp: data.story_points,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const priorityData = Object.entries(stats.by_priority || {}).map(([name, value]) => ({
    name, value,
    color: { Highest: '#FF4569', High: '#FF8C42', Medium: '#FFB830', Low: '#00D4FF', Lowest: '#7BB3D3' }[name] || '#7BB3D3'
  }));

  return (
    <Grid container spacing={2.5}>
      {/* Status Pie */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: 280 }}>
          <CardContent sx={{ p: 2, height: '100%' }}>
            <Typography variant="overline" sx={{ color: '#7BB3D3' }}>Status</Typography>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={statusData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={3}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color}
                      stroke="transparent"
                      style={{ filter: `drop-shadow(0 0 6px ${entry.color}60)` }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {statusData.map(d => (
                <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <Typography variant="caption" sx={{ color: '#7BB3D3' }}>{d.name} ({d.value})</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Type Pie */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: 280 }}>
          <CardContent sx={{ p: 2, height: '100%' }}>
            <Typography variant="overline" sx={{ color: '#7BB3D3' }}>Issue Types</Typography>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={typeData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={3}
                >
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent"
                      style={{ filter: `drop-shadow(0 0 6px ${entry.color}60)` }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {typeData.map(d => (
                <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <Typography variant="caption" sx={{ color: '#7BB3D3' }}>{d.name} ({d.value})</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Assignee Bar */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: 280 }}>
          <CardContent sx={{ p: 2, height: '100%' }}>
            <Typography variant="overline" sx={{ color: '#7BB3D3' }}>Workload by Assignee</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assigneeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: '#7BB3D3', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7BB3D3', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total" fill="#00D4FF" radius={[4,4,0,0]}
                  fillOpacity={0.7}
                  style={{ filter: 'drop-shadow(0 0 4px #00D4FF60)' }}
                />
                <Bar dataKey="done" name="Done" fill="#00E676" radius={[4,4,0,0]}
                  fillOpacity={0.9}
                  style={{ filter: 'drop-shadow(0 0 4px #00E67660)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Priority */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: 280 }}>
          <CardContent sx={{ p: 2, height: '100%' }}>
            <Typography variant="overline" sx={{ color: '#7BB3D3' }}>Priority Distribution</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#7BB3D3', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#7BB3D3', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Count" radius={[0,4,4,0]}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color}
                      style={{ filter: `drop-shadow(0 0 4px ${entry.color}60)` }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Story Points */}
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: 280 }}>
          <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="overline" sx={{ color: '#7BB3D3' }}>Story Points</Typography>
            {[
              { label: 'Total SP', value: stats.total_story_points, color: '#7BB3D3' },
              { label: 'Completed SP', value: stats.done_story_points, color: '#00E676' },
              { label: 'In Progress SP', value: stats.in_progress_story_points, color: '#00D4FF' },
              { label: 'SP Completion', value: `${stats.sp_completion_rate}%`, color: '#7B61FF' },
            ].map(item => (
              <Box key={item.label} sx={{
                p: 1.5, borderRadius: '8px', mb: 1,
                background: `${item.color}0A`,
                border: `1px solid ${item.color}20`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <Typography variant="caption" sx={{ color: '#7BB3D3' }}>{item.label}</Typography>
                <Typography variant="h5" sx={{ color: item.color, fontWeight: 700 }}>{item.value}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
