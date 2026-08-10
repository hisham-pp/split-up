'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setSyncingFinished, clearSyncedToast } from '@/store/slices/uiSlice';
import { WifiOff, RefreshCw, Check } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

export const OfflineBanner: React.FC = () => {
  const dispatch = useDispatch();
  const { isOffline, isSyncing, pendingSyncCount, showSyncedToast } = useSelector(
    (state: RootState) => state.ui
  );

  useEffect(() => {
    if (isSyncing) {
      const timer = setTimeout(() => {
        dispatch(setSyncingFinished());
        triggerHaptic([30, 50, 30]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, dispatch]);

  useEffect(() => {
    if (showSyncedToast) {
      const timer = setTimeout(() => {
        dispatch(clearSyncedToast());
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSyncedToast, dispatch]);

  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold backdrop-blur-md transition-all">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-dot" />
        <WifiOff className="w-3.5 h-3.5" />
        <span>
          Offline {pendingSyncCount > 0 ? `· ${pendingSyncCount} pending` : ''}
        </span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md transition-all">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (showSyncedToast) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold backdrop-blur-md transition-all animate-fade-in">
        <Check className="w-3.5 h-3.5" />
        <span>Synced</span>
      </div>
    );
  }

  return null;
};
