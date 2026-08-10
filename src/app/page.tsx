'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { FAB } from '@/components/layout/FAB';
import { HomeView } from '@/views/HomeView';
import { GroupsView } from '@/views/GroupsView';
import { GroupDetailView } from '@/views/GroupDetailView';
import { ActivityView } from '@/views/ActivityView';
import { ProfileView } from '@/views/ProfileView';
import { AddExpenseSheet } from '@/views/AddExpenseSheet';
import { AuthModal } from '@/components/auth/AuthModal';

export default function MainPage() {
  const { activeTab, activeGroup } = useSelector((state: RootState) => state.ui);

  const renderCurrentView = () => {
    if (activeGroup) {
      return <GroupDetailView group={activeGroup as any} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeView />;
      case 'groups':
        return <GroupsView />;
      case 'activity':
        return <ActivityView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Desktop Navigation Sidebar (>1024px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Sticky Mobile Header */}
        <MobileHeader />

        {/* Scrollable Page Body with bottom padding for FAB & BottomNav */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 safe-pb">
          {renderCurrentView()}
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
  );
}
