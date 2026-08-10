'use client';

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveTab, setActiveGroup, NavTab } from '@/store/slices/uiSlice';
import { Home, Users, Activity, User } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

export const MobileBottomNav: React.FC = () => {
  const dispatch = useDispatch();
  const activeTab = useSelector((state: RootState) => state.ui.activeTab);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Soft keyboard detection
    const handleResize = () => {
      if (window.visualViewport) {
        const isKeyboard = window.visualViewport.height < window.innerHeight - 150;
        setIsKeyboardOpen(isKeyboard);
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  if (isKeyboardOpen) return null;

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleTabClick = (tabId: NavTab) => {
    triggerHaptic(12);
    dispatch(setActiveTab(tabId));
    dispatch(setActiveGroup(null));
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 safe-nav-bottom transition-all duration-200"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`relative flex flex-col items-center justify-center h-full py-1 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-2 inset-y-1 bg-indigo-500/15 rounded-xl border border-indigo-500/20 -z-10 animate-fade-in" />
              )}
              <div className={`p-1 transition-transform duration-200 ${isActive ? '-translate-y-0.5 scale-110' : ''}`}>
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[11px] tracking-tight leading-none mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
