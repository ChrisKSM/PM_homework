import React, { useState, useEffect } from 'react';
import {
  Box, FormControl, Select, MenuItem, InputLabel, Button,
  Typography, CircularProgress, Chip, Tooltip, IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import dayjs from 'dayjs';
import { jiraApi } from '../../services/api';

export default function SprintSelector({ onSprintSelect, onAnalyze, loading, analyzing }) {
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    jiraApi.getProjects()
      .then(setProjects)
      .catch(e => setError(e.message));
  }, []);

  const handleProjectChange = async (key) => {
    setSelectedProject(key);
    setSelectedBoard('');
    setSelectedSprint('');
    setBoards([]);
    setSprints([]);
    setLoadingBoards(true);
    try {
      const data = await jiraApi.getBoards(key);
      setBoards(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleBoardChange = async (id) => {
    setSelectedBoard(id);
    setSelectedSprint('');
    setSprints([]);
    setLoadingSprints(true);
    try {
      const data = await jiraApi.getSprints(id);
      setSprints(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSprints(false);
    }
  };

  const handleSprintChange = (id) => {
    setSelectedSprint(id);
    const sprint = sprints.find(s => s.id === id);
    onSprintSelect(id, sprint);
  };

  const activeSprint = sprints.find(s => s.state === 'active');
  const selectedSprintObj = sprints.find(s => s.id === selectedSprint);

  const selectSx = {
    minWidth: 180,
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,212,255,0.2)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,212,255,0.4)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00D4FF' },
    '& .MuiSelect-select': { fontSize: '0.85rem', py: 1 },
  };

  return (
    <Box sx={{
      p: 2.5,
      background: 'linear-gradient(135deg, rgba(13,27,42,0.95), rgba(8,18,32,0.98))',
      border: '1px solid rgba(0,212,255,0.1)',
      borderRadius: '14px',
      mb: 3,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Project */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: '#7BB3D3', fontSize: '0.8rem' }}>Project</InputLabel>
          <Select
            value={selectedProject}
            label="Project"
            onChange={e => handleProjectChange(e.target.value)}
            sx={selectSx}
          >
            {projects.map(p => (
              <MenuItem key={p.key} value={p.key}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.key}</Typography>
                  <Typography variant="caption" sx={{ color: '#7BB3D3' }}>{p.name}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Board */}
        <FormControl size="small" disabled={!selectedProject || loadingBoards} sx={{ minWidth: 160 }}>
          <InputLabel sx={{ color: '#7BB3D3', fontSize: '0.8rem' }}>Board</InputLabel>
          <Select
            value={selectedBoard}
            label="Board"
            onChange={e => handleBoardChange(e.target.value)}
            sx={selectSx}
          >
            {boards.map(b => (
              <MenuItem key={b.id} value={b.id}>
                <Typography variant="body2">{b.name}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sprint */}
        <FormControl size="small" disabled={!selectedBoard || loadingSprints} sx={{ minWidth: 220 }}>
          <InputLabel sx={{ color: '#7BB3D3', fontSize: '0.8rem' }}>Sprint</InputLabel>
          <Select
            value={selectedSprint}
            label="Sprint"
            onChange={e => handleSprintChange(e.target.value)}
            sx={selectSx}
          >
            {sprints.map(s => (
              <MenuItem key={s.id} value={s.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{s.name}</Typography>
                  {s.state === 'active' && (
                    <Chip label="Active" size="small" sx={{
                      height: 16, fontSize: '0.55rem', fontWeight: 700,
                      background: 'rgba(0,230,118,0.15)', color: '#00E676',
                    }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sprint info */}
        {selectedSprintObj && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={selectedSprintObj.state?.toUpperCase()}
              size="small"
              sx={{
                fontWeight: 700, fontSize: '0.65rem',
                background: selectedSprintObj.state === 'active'
                  ? 'rgba(0,230,118,0.12)' : 'rgba(0,212,255,0.08)',
                color: selectedSprintObj.state === 'active' ? '#00E676' : '#00D4FF',
                border: `1px solid ${selectedSprintObj.state === 'active' ? '#00E67630' : '#00D4FF30'}`,
              }}
            />
            {selectedSprintObj.endDate && (
              <Typography variant="caption" sx={{ color: '#7BB3D3' }}>
                Ends {dayjs(selectedSprintObj.endDate).format('MMM D')}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Load WBS */}
        <Button
          variant="outlined"
          disabled={!selectedSprint || loading}
          onClick={() => onSprintSelect(selectedSprint, selectedSprintObj)}
          startIcon={loading ? <CircularProgress size={14} /> : <AccountTreeIcon />}
          sx={{
            borderColor: 'rgba(0,212,255,0.3)', color: '#00D4FF',
            '&:hover': { borderColor: '#00D4FF', background: 'rgba(0,212,255,0.06)' },
          }}
        >
          Load WBS
        </Button>

        {/* AI Analyze */}
        <Button
          variant="contained"
          disabled={!selectedSprint || analyzing}
          onClick={() => onAnalyze(selectedSprint, selectedSprintObj)}
          startIcon={analyzing ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <AutoAwesomeIcon />}
          sx={{
            background: 'linear-gradient(135deg, #7B61FF, #00D4FF)',
            color: '#fff', fontWeight: 700,
            '&:hover': { boxShadow: '0 4px 20px rgba(123,97,255,0.4)' },
          }}
        >
          {analyzing ? 'Analyzing...' : 'AI Analyze'}
        </Button>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: '#FF4569', display: 'block', mt: 1 }}>
          ⚠ {error}
        </Typography>
      )}
    </Box>
  );
}
