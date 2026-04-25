import { createTheme, alpha } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00D4FF', light: '#33DDFF', dark: '#0099BB', contrastText: '#000' },
    secondary: { main: '#7B61FF', light: '#9E85FF', dark: '#5A45CC', contrastText: '#fff' },
    success: { main: '#00E676', light: '#33EB91', dark: '#00B248' },
    warning: { main: '#FFB830', light: '#FFC759', dark: '#CC9226' },
    error: { main: '#FF4569', light: '#FF6A87', dark: '#CC364F' },
    info: { main: '#29B6F6', light: '#54C4F8', dark: '#0288D1' },
    background: { default: '#050A14', paper: '#0D1B2A' },
    text: { primary: '#E8F4FD', secondary: '#7BB3D3' },
    divider: 'rgba(0, 212, 255, 0.12)',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.1rem', fontWeight: 600 },
    h5: { fontSize: '0.95rem', fontWeight: 600 },
    h6: { fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8rem', lineHeight: 1.5 },
    caption: { fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace" },
    overline: { fontSize: '0.65rem', letterSpacing: '0.12em', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'linear-gradient(135deg, rgba(13,27,42,0.95) 0%, rgba(8,18,32,0.98) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.08)',
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'linear-gradient(135deg, rgba(13,27,42,0.95) 0%, rgba(8,18,32,0.98) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            border: '1px solid rgba(0, 212, 255, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00D4FF 0%, #0099BB 100%)',
          color: '#000',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.72rem' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '&.MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 212, 255, 0.2)',
          },
          '&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 212, 255, 0.5)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6, backgroundColor: 'rgba(255,255,255,0.06)' },
      },
    },
  },
});
