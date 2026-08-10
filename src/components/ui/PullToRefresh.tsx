'use client';

import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isTopRef = useRef(true);

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    isTopRef.current = scrollTop <= 0;
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTopRef.current || isRefreshing) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0 && deltaY < 120) {
      setPullY(deltaY * 0.5); // Resistance factor
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 40 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic([15, 30]);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullY(0);
        }, 600);
      }
    } else {
      setPullY(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full"
    >
      {/* Refresh Spinner Indicator */}
      <div
        style={{
          height: isRefreshing ? '44px' : `${pullY}px`,
          opacity: pullY > 10 || isRefreshing ? 1 : 0,
          transition: isRefreshing ? 'height 0.2s' : 'none',
        }}
        className="flex items-center justify-center overflow-hidden transition-opacity"
      >
        <div className="p-2 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <RefreshCw
            className={`w-5 h-5 ${
              isRefreshing || pullY > 35 ? 'animate-spin' : ''
            }`}
          />
        </div>
      </div>

      {children}
    </div>
  );
};
