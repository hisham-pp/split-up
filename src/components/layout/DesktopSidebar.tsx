'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveTab, setActiveGroup, openAddExpenseSheet, NavTab } from '@/store/slices/uiSlice';
import { openAuthModal, logout } from '@/store/slices/authSlice';
import { Home, Users, Activity, User, Plus, Sparkles, LogIn, LogOut } from 'lucide-react';

export const DesktopSidebar: React.FC = () => {
  const dispatch = useDispatch();
  const { activeTab } = useSelector((state: RootState) => state.ui);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'activity', label: 'Activity Feed', icon: Activity },
    { id: 'profile', label: 'Profile & Settings', icon: User },
  ];

  const handleNav = (tabId: NavTab) => {
    dispatch(setActiveTab(tabId));
    dispatch(setActiveGroup(null));
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-surface-container-low p-5 z-20">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-4 py-2 mb-8 mt-2">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-on-primary-container" />
        </div>
        <div>
          <h1 className="font-bold text-xl text-on-surface tracking-tight leading-tight">
            SplitUp
          </h1>
          <p className="text-xs text-on-surface-variant font-medium">Native Expense App</p>
        </div>
      </div>

      {/* Primary Action */}
      <button
        onClick={() => dispatch(openAddExpenseSheet())}
        className="flex items-center justify-start gap-3 w-full py-4 px-5 mb-8 rounded-2xl bg-primary-container hover:bg-primary-container/80 text-on-primary-container font-medium shadow-sm active:scale-98 transition-all"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>Add Expense</span>
      </button>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1">
        <p className="px-5 text-sm font-medium text-on-surface-variant mb-4">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex items-center gap-4 w-full px-5 py-3.5 rounded-full font-medium text-sm transition-all ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dynamic User Profile Card */}
      <div className="pt-4 mt-auto">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
              }
              alt={user?.fullName || 'User'}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">
                {user?.fullName || 'Guest User'}
              </p>
              <p className="text-xs text-on-surface-variant truncate font-medium">
                {user?.email || 'guest@splitup.app'}
              </p>
            </div>
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => dispatch(logout())}
              className="p-2 text-on-surface-variant hover:text-error rounded-full hover:bg-error/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => dispatch(openAuthModal('login'))}
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-variant transition-colors"
              title="Sign In"
            >
              <LogIn className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
