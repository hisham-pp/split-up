'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setCurrency } from '@/store/slices/uiSlice';
import { openAuthModal, logout } from '@/store/slices/authSlice';
import { subscribeSyncStatus, processSyncQueue, SyncStatus } from '@/lib/sync/syncEngine';
import { isSupabaseConfigured } from '@/lib/supabase/supabase';
import {
  User,
  LogOut,
  LogIn,
  RefreshCw,
  Wifi,
  WifiOff,
  DollarSign,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingQueueCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    await processSyncQueue();
  };

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Account & Settings</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Manage session, sync engine, and currency preferences</p>
      </div>

      {/* User Card */}
      <div className="p-6 rounded-lg bg-surface-container border border-outline/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={user?.fullName || 'User'}
            className="w-14 h-14 rounded-md object-cover border border-outline/30"
          />

          <div>
            <h3 className="text-lg font-bold text-on-surface">{user?.fullName || 'Guest User'}</h3>
            <p className="text-xs text-on-surface-variant">{user?.email || 'Offline mode active'}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-sm bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Active Session
              </span>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => dispatch(logout())}
            className="p-3 rounded-md bg-error/10 text-error hover:bg-error/20 transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => dispatch(openAuthModal('login'))}
            className="px-4 py-2.5 rounded-md bg-primary hover:bg-surface-variant text-on-primary hover:text-on-surface border border-outline/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* Sync Engine & Offline Mode Status */}
      <div className="p-6 rounded-lg bg-surface-container border border-outline/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="w-5 h-5 text-on-surface" />
            ) : (
              <WifiOff className="w-5 h-5 text-on-surface-variant" />
            )}
            <h3 className="text-sm font-bold text-on-surface">Sync Engine Status</h3>
          </div>

          <span
            className={`px-3 py-1 rounded-sm border border-outline/20 text-xs font-bold ${
              syncStatus.isOnline ? 'bg-surface-variant text-on-surface' : 'bg-surface text-on-surface-variant'
            }`}
          >
            {syncStatus.isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline/20">
          <div className="p-3 rounded-md bg-background border border-outline/30">
            <p className="text-[11px] text-on-surface-variant font-medium">Pending Mutations Queue</p>
            <p className="text-lg font-bold text-primary mt-0.5">
              {syncStatus.pendingQueueCount} operations
            </p>
          </div>

          <div className="p-3 rounded-md bg-background border border-outline/30">
            <p className="text-[11px] text-on-surface-variant font-medium">Supabase Cloud Sync</p>
            <p className="text-xs font-bold text-on-surface mt-1 truncate">
              {isSupabaseConfigured ? 'Connected' : 'Local IndexedDB Mode'}
            </p>
          </div>
        </div>

        <button
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing}
          className="w-full py-3 rounded-md bg-surface border border-outline/30 hover:bg-surface-variant text-on-surface font-bold text-xs transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          <span>{syncStatus.isSyncing ? 'Syncing with cloud...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Currency Preference */}
      <div className="p-6 rounded-lg bg-surface-container border border-outline/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-surface-variant border border-outline/20 text-on-surface flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Default Currency</h3>
            <p className="text-xs text-on-surface-variant font-medium">Select display currency format</p>
          </div>
        </div>

        <select
          value={currency}
          onChange={(e) => dispatch(setCurrency(e.target.value as any))}
          className="bg-background border border-outline/30 rounded-md px-4 py-2 text-xs font-bold text-primary outline-none focus:border-primary"
        >
          <option value="₹">₹ INR (Rupees)</option>
          <option value="$">$ USD (Dollars)</option>
          <option value="€">€ EUR (Euros)</option>
          <option value="£">£ GBP (Pounds)</option>
        </select>
      </div>

      {/* PWA & Security Info */}
      <div className="p-5 rounded-lg bg-surface-container border border-outline/20 flex items-center gap-3 text-xs text-on-surface-variant font-medium">
        <ShieldCheck className="w-5 h-5 text-on-surface shrink-0" />
        <span>
          Split Up uses client-side IndexedDB persistence with Row Level Security (RLS) for privacy.
        </span>
      </div>
    </div>
  );
};
