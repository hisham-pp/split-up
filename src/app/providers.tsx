'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { seedInitialLocalData } from '@/lib/db/db';
import { initializeAuthSession } from '@/store/slices/authSlice';
import { processSyncQueue } from '@/lib/sync/syncEngine';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function initApp() {
      await seedInitialLocalData();
      await initializeAuthSession(store.dispatch);
      await processSyncQueue();

      // Register PWA Service Worker in production
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('SW registration skipped:', err);
        });
      }
    }
    initApp();
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
