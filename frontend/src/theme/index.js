import { createTheme, alpha } from '@mui/material/styles';

const NEON_BLUE = '#00d4ff';
const NEON_PURPLE = '#7c3aed';
const NEON_GREEN = '#00ff88';
const NEON_ORANGE = '#ff6b35';
const NEON_RED = '#ff3366';
const BG_DEEP = '#060b18';
const BG_CARD = '#0d1628';
const BG_ELEVATED = '#111e35';
const BORDER = 'rgba(0,212,255,0.12)';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: NEON_BLUE, light: '#33ddff', dark: '#0099cc' },
    secondary: { main: NEON_PURPLE, light: '#9d61ff', dark: '#5b21b6' },
    success: { main: NEON_GREEN, light: '#33ff9e', dark: '#00cc66' },
    warning: { main: NEON_ORANGE, light: '#ff8c5a', dark: '#cc4400' },
    error: { main: NEON_RED, light: '#ff6688', dark: '#cc0044' },
    background: { default: BG_DEEP, paper: BG_CARD },
    text: { primary: '#e2eaf7', secondary: '#8da0bb' },
    divider: BORDER,
  },
  typography: {
    fontFamily: "'Space Grotesk', sans-serif",
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    caption: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' },
    overline: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: BG_DEEP,
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,212,255,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 80% 80%, rgba(124,58,237,0.04) 0%, transparent 50%)
          `,
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(NEON_BLUE, 0.3)} transparent`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          backdropFilter: 'blur(12px)',
          '&:hover': { border: `1px solid ${alpha(NEON_BLUE, 0.3)}` },
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
        containedPrimary: {
          background: `linear-gradient(135deg, ${NEON_BLUE}, ${NEON_PURPLE})`,
          boxShadow: `0 0 20px ${alpha(NEON_BLUE, 0.3)}`,
          '&:hover': { boxShadow: `0 0 30px ${alpha(NEON_BLUE, 0.5)}` },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6, backgroundColor: alpha(NEON_BLUE, 0.1) },
        bar: { background: `linear-gradient(90deg, ${NEON_BLUE}, ${NEON_GREEN})` },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: BORDER },
        head: { background: BG_ELEVATED, fontWeight: 600, color: NEON_BLUE, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', letterSpacing: '0.08em' },
      },
    },
  },
});

export const COLORS = {
  neonBlue: NEON_BLUE, neonPurple: NEON_PURPLE, neonGreen: NEON_GREEN,
  neonOrange: NEON_ORANGE, neonRed: NEON_RED,
  bgDeep: BG_DEEP, bgCard: BG_CARD, bgElevated: BG_ELEVATED, border: BORDER,
};

export const STATUS_COLORS = {
  done: NEON_GREEN,
  indeterminate: NEON_BLUE,
  new: '#8da0bb',
  'in-progress': NEON_ORANGE,
};

export const PRIORITY_COLORS = {
  Highest: NEON_RED,
  High: NEON_ORANGE,
  Medium: '#f59e0b',
  Low: NEON_BLUE,
  Lowest: '#8da0bb',
};

export const RISK_COLORS = {
  HIGH: NEON_RED,
  MEDIUM: NEON_ORANGE,
  LOW: '#f59e0b',
};

export const TYPE_COLORS = {
  Epic: NEON_PURPLE,
  Story: NEON_BLUE,
  Task: NEON_BLUE,
  'Sub-task': '#8da0bb',
  Subtask: '#8da0bb',
  Bug: NEON_RED,
};

export const CHART_COLORS = [NEON_BLUE, NEON_PURPLE, NEON_GREEN, NEON_ORANGE, NEON_RED, '#f59e0b', '#06b6d4'];
