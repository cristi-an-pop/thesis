import { createTheme } from '@mui/material/styles';

const darkGray = '#121212';
const mediumGray = '#1E1E1E';
//const lightGray = '#2D2D2D';
const primaryBlue = '#3F88F2';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: primaryBlue,
      light: '#619ff5',
      dark: '#0D47A1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6474E5',
      light: '#9EA7FF',
      dark: '#4756CB',
      contrastText: '#ffffff',
    },
    background: {
      default: darkGray,
      paper: mediumGray,
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#AAAAAA',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(63, 136, 242, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500, fontSize: '1.125rem' },
    subtitle1: { fontWeight: 500, fontSize: '1rem' },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.75rem', lineHeight: 1.43 },
    caption: { fontSize: '0.6875rem', lineHeight: 1.4 },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mediumGray,
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(63, 136, 242, 0.2)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: mediumGray,
          boxShadow: 'none',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mediumGray,
          boxShadow: 'none',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
        elevation1: {
          boxShadow: 'none',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 0',
          '&.Mui-selected': {
            backgroundColor: 'rgba(63, 136, 242, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(63, 136, 242, 0.16)',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});