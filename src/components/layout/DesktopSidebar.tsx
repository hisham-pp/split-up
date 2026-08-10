'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveTab, setActiveGroup, openAddExpenseSheet, NavTab } from '@/store/slices/uiSlice';
import { Home, Users, Activity, User, Plus, Sparkles, LogOut, Settings } from 'lucide-react';
import { CURRENT_USER } from '@/store/api/expenseApi';

export const DesktopSidebar: React.FC = () => {
  const dispatch = useDispatch();
  const { activeTab } = useSelector((state: RootState) => state.ui);

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
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-slate-950 border-r border-slate-800/80 p-5 z-20">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-3 py-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-xl text-white tracking-tight leading-tight">
            SplitUp
          </h1>
          <p className="text-xs text-indigo-400 font-medium">Native Expense App</p>
        </div>
      </div>

      {/* Primary Action */}
      <button
        onClick={() => dispatch(openAddExpenseSheet())}
        className="flex items-center justify-center gap-2.5 w-full py-3 px-4 mb-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 active:scale-98 transition-all"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>Add Expense</span>
      </button>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-1.5">
        <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <img
            src={CURRENT_USER.avatar}
            alt={CURRENT_USER.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {CURRENT_USER.name}
            </p>
            <p className="text-xs text-slate-400 truncate">{CURRENT_USER.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
