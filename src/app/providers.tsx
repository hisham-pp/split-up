'use client';

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

export function Providers({ children }: { children: React.ReactNode }) {
  const darkTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#6366f1',
            dark: '#4f46e5',
            light: '#818cf8',
          },
          secondary: {
            main: '#10b981',
          },
          background: {
            default: '#090d16',
            paper: '#131b2e',
          },
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
          },
        },
        typography: {
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
        shape: {
          borderRadius: 16,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '12px',
              },
            },
          },
        },
      }),
    []
  );

  return (
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Provider>
  );
}
