'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveGroup } from '@/store/slices/uiSlice';
import { OfflineBanner } from '../ui/OfflineBanner';
import { ArrowLeft, MoreVertical, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

export const MobileHeader: React.FC = () => {
  const dispatch = useDispatch();
  const { activeGroup, activeTab } = useSelector((state: RootState) => state.ui);

  const handleBack = () => {
    triggerHaptic(10);
    dispatch(setActiveGroup(null));
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-surface safe-pt px-4 py-3">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        {activeGroup ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src={
                  activeGroup.coverImage ||
                  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                }
                alt={activeGroup.name || 'Group'}
                className="w-10 h-10 rounded-2xl object-cover"
              />
              <div>
                <h1 className="font-bold text-on-surface text-base leading-tight">
                  {activeGroup.name}
                </h1>
                <p className="text-xs text-on-surface-variant font-medium">
                  {Array.isArray(activeGroup?.members)
                    ? `${activeGroup.members.length} members`
                    : activeGroup?.category || 'Group'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-on-primary-container" />
            </div>
            <div>
              <span className="font-medium text-xl text-on-surface tracking-tight">
                SplitUp
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                {activeTab.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <OfflineBanner />

          {activeGroup && (
            <button
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-all"
              aria-label="Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
