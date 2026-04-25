import { useState, useEffect } from 'react';
import {
  Box, FormControl, Select, MenuItem, Typography, CircularProgress,
  InputLabel, Chip, Alert,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { jiraApi } from '../../services/api';
import { alpha } from '@mui/material/styles';
import { COLORS } from '../../theme';

export default function SprintSelector({ onSelect }) {
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [project, setProject] = useState('');
  const [board, setBoard] = useState('');
  const [sprint, setSprint] = useState('');
  const [loading, setLoading] = useState({ projects: false, boards: false, sprints: false });
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(l => ({ ...l, projects: true }));
    jiraApi.getProjects()
      .then(setProjects)
      .catch(e => setError(`프로젝트 로드 실패: ${e}`))
      .finally(() => setLoading(l => ({ ...l, projects: false })));
  }, []);

  const handleProject = async (key) => {
    setProject(key); setBoard(''); setSprint(''); setBoards([]); setSprints([]);
    setLoading(l => ({ ...l, boards: true }));
    try {
      const b = await jiraApi.getBoards(key);
      setBoards(b);
    } catch (e) { setError(`보드 로드 실패: ${e}`); }
    finally { setLoading(l => ({ ...l, boards: false })); }
  };

  const handleBoard = async (id) => {
    setBoard(id); setSprint(''); setSprints([]);
    setLoading(l => ({ ...l, sprints: true }));
    try {
      const s = await jiraApi.getSprints(id);
      setSprints(s);
    } catch (e) { setError(`스프린트 로드 실패: ${e}`); }
    finally { setLoading(l => ({ ...l, sprints: false })); }
  };

  const handleSprint = (id) => {
    setSprint(id);
    const s = sprints.find(x => x.id === id);
    if (s) onSelect({ sprint: s, boardId: board });
  };

  const stateColor = (state) =>
    state === 'active' ? COLORS.neonGreen : state === 'future' ? COLORS.neonBlue : COLORS.border;

  return (
    <Box
      sx={{
        p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`,
        background: alpha(COLORS.bgCard, 0.8),
        backdropFilter: 'blur(12px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <RocketLaunchIcon sx={{ color: COLORS.neonBlue, fontSize: 20 }} />
        <Typography variant="overline" sx={{ color: COLORS.neonBlue }}>
          Sprint 선택
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>프로젝트</InputLabel>
          <Select value={project} label="프로젝트" onChange={e => handleProject(e.target.value)}
            disabled={loading.projects}>
            {loading.projects
              ? <MenuItem disabled><CircularProgress size={16} /></MenuItem>
              : projects.map(p => (
                <MenuItem key={p.key} value={p.key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {p.avatar_url && <img src={p.avatar_url} width={16} height={16} style={{ borderRadius: 2 }} />}
                    <span>{p.key} – {p.name}</span>
                  </Box>
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }} disabled={!boards.length}>
          <InputLabel>보드</InputLabel>
          <Select value={board} label="보드" onChange={e => handleBoard(e.target.value)}
            disabled={loading.boards}>
            {loading.boards
              ? <MenuItem disabled><CircularProgress size={16} /></MenuItem>
              : boards.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 260 }} disabled={!sprints.length}>
          <InputLabel>스프린트</InputLabel>
          <Select value={sprint} label="스프린트" onChange={e => handleSprint(e.target.value)}
            disabled={loading.sprints}>
            {loading.sprints
              ? <MenuItem disabled><CircularProgress size={16} /></MenuItem>
              : sprints.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: stateColor(s.state), flexShrink: 0,
                    }} />
                    <span>{s.name}</span>
                    <Chip label={s.state} size="small"
                      sx={{ ml: 'auto', fontSize: '0.65rem', height: 18,
                        color: stateColor(s.state), borderColor: stateColor(s.state) }}
                      variant="outlined" />
                  </Box>
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
