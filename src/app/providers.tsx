'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { seedInitialLocalData } from '@/lib/db/db';
import { initializeAuthSession } from '@/store/slices/authSlice';
import { processSyncQueue } from '@/lib/sync/syncEngine';

import { usePathname } from 'next/navigation';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { FAB } from '@/components/layout/FAB';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AddExpenseSheet } from '@/views/AddExpenseSheet';
import { AuthModal } from '@/components/auth/AuthModal';

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

  const pathname = usePathname();
  const isJoinPage = pathname?.startsWith('/join');

  return (
    <Provider store={store}>
      {isJoinPage ? (
        children
      ) : (
        <div className="flex min-h-screen bg-background text-on-background font-sans antialiased">
          {/* Desktop Navigation Sidebar */}
          <DesktopSidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-screen">
            {/* Sticky Mobile Header */}
            <MobileHeader />

            {/* Scrollable Page Body */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 safe-pb">
              {children}
            </main>

            {/* Mobile Floating Action Button */}
            <FAB />

            {/* Fixed Mobile Bottom Navigation */}
            <MobileBottomNav />

            {/* Add Expense Bottom Sheet Modal */}
            <AddExpenseSheet />

            {/* Authentication Modal */}
            <AuthModal />
          </div>
        </div>
      )}
    </Provider>
  );
}
