import React, { useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Collapse, LinearProgress,
  Tooltip, Avatar,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BugReportIcon from '@mui/icons-material/BugReport';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_CONFIG = {
  Epic:     { color: '#7B61FF', bg: 'rgba(123,97,255,0.12)', label: 'E' },
  Story:    { color: '#00D4FF', bg: 'rgba(0,212,255,0.10)', label: 'S' },
  Task:     { color: '#00E676', bg: 'rgba(0,230,118,0.10)', label: 'T' },
  Bug:      { color: '#FF4569', bg: 'rgba(255,69,105,0.10)', label: 'B' },
  'Sub-task': { color: '#FFB830', bg: 'rgba(255,184,48,0.10)', label: '↳' },
};

const STATUS_COLOR = {
  done: '#00E676',
  indeterminate: '#00D4FF',
  new: '#7BB3D3',
};

const PRIORITY_COLOR = {
  Highest: '#FF4569', High: '#FF8C42', Medium: '#FFB830',
  Low: '#00D4FF', Lowest: '#7BB3D3',
};

function IssueRow({ issue, depth = 0, index = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = issue.children && issue.children.length > 0;
  const cfg = TYPE_CONFIG[issue.issue_type] || TYPE_CONFIG.Story;
  const statusColor = STATUS_COLOR[issue.status_category] || '#7BB3D3';
  const priorityColor = PRIORITY_COLOR[issue.priority] || '#FFB830';

  const childDone = hasChildren
    ? issue.children.filter(c => c.status_category === 'done').length : 0;
  const childProgress = hasChildren
    ? Math.round((childDone / issue.children.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Box
        sx={{
          ml: depth * 3,
          mb: 0.5,
          borderRadius: '10px',
          border: `1px solid ${cfg.color}18`,
          background: depth === 0
            ? `linear-gradient(135deg, ${cfg.bg}, rgba(5,10,20,0.6))`
            : 'rgba(13,27,42,0.4)',
          transition: 'all 0.2s',
          '&:hover': {
            border: `1px solid ${cfg.color}40`,
            background: depth === 0
              ? `linear-gradient(135deg, ${cfg.bg}, rgba(5,10,20,0.8))`
              : `${cfg.bg}`,
          },
        }}
      >
        {/* Row header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, pr: 1.5 }}>
          {/* Type badge */}
          <Box sx={{
            width: 22, height: 22, borderRadius: '6px',
            background: cfg.bg, border: `1px solid ${cfg.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: cfg.color, fontFamily: 'JetBrains Mono' }}>
              {cfg.label}
            </Typography>
          </Box>

          {/* Key */}
          <Typography variant="caption" sx={{
            color: cfg.color, fontFamily: 'JetBrains Mono', fontWeight: 600,
            flexShrink: 0, minWidth: 70,
          }}>
            {issue.key}
          </Typography>

          {/* Summary */}
          <Typography variant="body2" sx={{
            color: '#E8F4FD', flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: depth === 0 ? 600 : 400,
          }}>
            {issue.summary}
          </Typography>

          {/* Status */}
          <Chip
            label={issue.status}
            size="small"
            sx={{
              height: 20, fontSize: '0.65rem', fontWeight: 600, flexShrink: 0,
              background: `${statusColor}18`,
              color: statusColor,
              border: `1px solid ${statusColor}30`,
            }}
          />

          {/* Priority dot */}
          <Tooltip title={issue.priority}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%',
              background: priorityColor, flexShrink: 0,
              boxShadow: `0 0 6px ${priorityColor}80`,
            }} />
          </Tooltip>

          {/* Story points */}
          {issue.story_points > 0 && (
            <Chip
              label={`${issue.story_points}sp`}
              size="small"
              sx={{
                height: 20, fontSize: '0.65rem', fontWeight: 600, flexShrink: 0,
                background: 'rgba(0,212,255,0.08)',
                color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)',
              }}
            />
          )}

          {/* Assignee avatar */}
          {issue.assignee !== 'Unassigned' && (
            <Tooltip title={issue.assignee}>
              <Avatar
                src={issue.assignee_avatar}
                sx={{ width: 22, height: 22, fontSize: '0.6rem', flexShrink: 0 }}
              >
                {issue.assignee[0]}
              </Avatar>
            </Tooltip>
          )}

          {/* Expand toggle */}
          {hasChildren && (
            <IconButton size="small" onClick={() => setOpen(!open)} sx={{ p: 0.2 }}>
              {open
                ? <ExpandLessIcon sx={{ fontSize: 16, color: '#7BB3D3' }} />
                : <ExpandMoreIcon sx={{ fontSize: 16, color: '#7BB3D3' }} />
              }
            </IconButton>
          )}
        </Box>

        {/* Child progress bar */}
        {hasChildren && depth === 0 && (
          <Box sx={{ px: 1.5, pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                {childDone}/{issue.children.length} completed
              </Typography>
              <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>
                {childProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={childProgress}
              sx={{
                height: 3, borderRadius: 2,
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {issue.children.map((child, idx) => (
              <IssueRow key={child.key} issue={child} depth={depth + 1} index={idx} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function WBSTree({ wbsTree = [], stats = {} }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? wbsTree.filter(n =>
        n.summary.toLowerCase().includes(search.toLowerCase()) ||
        n.key.toLowerCase().includes(search.toLowerCase())
      )
    : wbsTree;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ color: '#E8F4FD', mb: 0.3 }}>
            WBS Tree
          </Typography>
          <Typography variant="body2" sx={{ color: '#7BB3D3' }}>
            {stats.total || 0} issues · Epic → Story → Sub-task hierarchy
          </Typography>
        </Box>

        {/* Search */}
        <Box
          component="input"
          placeholder="Search issues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{
            background: 'rgba(0,212,255,0.05)',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: '8px',
            color: '#E8F4FD',
            px: 1.5, py: 0.8,
            fontSize: '0.8rem',
            outline: 'none',
            width: 200,
            '&::placeholder': { color: '#7BB3D3' },
            '&:focus': { borderColor: 'rgba(0,212,255,0.4)' },
          }}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <Chip
            key={type}
            label={type}
            size="small"
            sx={{
              background: cfg.bg, color: cfg.color,
              border: `1px solid ${cfg.color}30`, fontSize: '0.7rem',
            }}
          />
        ))}
      </Box>

      {/* Tree */}
      <Box sx={{ maxHeight: 600, overflowY: 'auto', pr: 0.5 }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body2" sx={{ color: '#7BB3D3' }}>No issues found</Typography>
          </Box>
        ) : (
          filtered.map((node, idx) => (
            <IssueRow key={node.key} issue={node} depth={0} index={idx} />
          ))
        )}
      </Box>
    </Box>
  );
}
