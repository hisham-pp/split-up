'use client';

import React, { useMemo, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { seedInitialLocalData } from '@/lib/db/db';
import { initializeAuthSession } from '@/store/slices/authSlice';
import { processSyncQueue } from '@/lib/sync/syncEngine';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function initApp() {
      await seedInitialLocalData();
      await initializeAuthSession(store.dispatch);
      await processSyncQueue();

      // Register PWA Service Worker
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('SW registration skipped:', err);
        });
      }
    }
    initApp();
  }, []);

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
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        shape: {
          borderRadius: 16,
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
