'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NavTab } from '@/store/slices/uiSlice';
import { Home, Users, Activity, User } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

export const MobileBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Determine active tab based on pathname
  let activeTab: NavTab = 'home';
  if (pathname === '/groups' || pathname?.startsWith('/groups/')) {
    activeTab = 'groups';
  } else if (pathname === '/activity') {
    activeTab = 'activity';
  } else if (pathname === '/profile') {
    activeTab = 'profile';
  }

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
    if (tabId === 'home') {
      router.push('/');
    } else {
      router.push(`/${tabId}`);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-outline/20 safe-nav-bottom transition-all duration-200"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 items-center h-20 max-w-md mx-auto px-2 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`relative flex flex-col items-center justify-center h-full pt-1 pb-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'text-on-surface font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="relative flex items-center justify-center w-16 h-8 mb-1 transition-all duration-200">
                {isActive && (
                  <span className="absolute inset-0 bg-primary-container rounded-full -z-10 animate-fade-in" />
                )}
                <Icon className={`w-5 h-5 stroke-[2] ${isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}`} />
              </div>
              <span className="text-[11px] tracking-tight leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
