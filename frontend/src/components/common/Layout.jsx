import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Divider, Avatar, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
  { label: 'WBS Tree', icon: <AccountTreeIcon fontSize="small" /> },
  { label: 'Risk Analysis', icon: <WarningAmberIcon fontSize="small" /> },
  { label: 'AI Insights', icon: <AutoAwesomeIcon fontSize="small" /> },
  { label: 'Velocity', icon: <SpeedIcon fontSize="small" /> },
];

export default function Layout() {
  const [active, setActive] = useState(0);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#050A14' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            background: 'linear-gradient(180deg, #08121E 0%, #050A14 100%)',
            border: 'none',
            borderRight: '1px solid rgba(0,212,255,0.08)',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, #00D4FF, #7B61FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,212,255,0.3)',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 18, color: '#000' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#E8F4FD', lineHeight: 1.1, fontSize: '0.9rem' }}>
                Jira WBS
              </Typography>
              <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                AI Dashboard
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(0,212,255,0.08)', mx: 2 }} />

        {/* Nav */}
        <List sx={{ px: 1.5, pt: 2, flex: 1 }}>
          {navItems.map((item, idx) => (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={active === idx}
                onClick={() => setActive(idx)}
                sx={{
                  borderRadius: '10px',
                  py: 1,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,97,255,0.1))',
                    border: '1px solid rgba(0,212,255,0.2)',
                    '& .MuiListItemIcon-root': { color: '#00D4FF' },
                    '& .MuiListItemText-primary': { color: '#00D4FF', fontWeight: 600 },
                  },
                  '&:hover': {
                    background: 'rgba(0,212,255,0.06)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: '#7BB3D3' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
                />
                {item.label === 'AI Insights' && (
                  <Chip label="AI" size="small" sx={{
                    height: 18, fontSize: '0.6rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
                    color: '#fff',
                  }} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ borderColor: 'rgba(0,212,255,0.08)', mx: 2 }} />

        {/* Footer */}
        <Box sx={{ p: 2 }}>
          <Box sx={{
            p: 1.5, borderRadius: '10px',
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.08)',
          }}>
            <Typography variant="caption" sx={{ color: '#7BB3D3', display: 'block', mb: 0.5 }}>
              Powered by
            </Typography>
            <Typography variant="caption" sx={{
              color: '#00D4FF', fontWeight: 600, fontFamily: 'JetBrains Mono',
            }}>
              GPT-4o + Jira Cloud
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 20% 20%, rgba(0,212,255,0.03) 0%, transparent 60%), #050A14',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
