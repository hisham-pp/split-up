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
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Account & Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Manage session, sync engine, and currency preferences</p>
      </div>

      {/* User Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={user?.fullName || 'User'}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/30"
          />

          <div>
            <h3 className="text-lg font-bold text-slate-100">{user?.fullName || 'Guest User'}</h3>
            <p className="text-xs text-slate-400">{user?.email || 'Offline mode active'}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                Active Session
              </span>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => dispatch(logout())}
            className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => dispatch(openAuthModal('login'))}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* Sync Engine & Offline Mode Status */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-400" />
            )}
            <h3 className="text-sm font-bold text-slate-100">Sync Engine Status</h3>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              syncStatus.isOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {syncStatus.isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <p className="text-[11px] text-slate-400">Pending Mutations Queue</p>
            <p className="text-lg font-extrabold text-indigo-400 mt-0.5">
              {syncStatus.pendingQueueCount} operations
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <p className="text-[11px] text-slate-400">Supabase Cloud Sync</p>
            <p className="text-xs font-bold text-slate-200 mt-1 truncate">
              {isSupabaseConfigured ? 'Connected' : 'Local IndexedDB Mode'}
            </p>
          </div>
        </div>

        <button
          onClick={handleManualSync}
          disabled={syncStatus.isSyncing}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          <span>{syncStatus.isSyncing ? 'Syncing with cloud...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Currency Preference */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Default Currency</h3>
            <p className="text-xs text-slate-400">Select display currency format</p>
          </div>
        </div>

        <select
          value={currency}
          onChange={(e) => dispatch(setCurrency(e.target.value as any))}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-indigo-400 outline-none focus:border-indigo-500"
        >
          <option value="₹">₹ INR (Rupees)</option>
          <option value="$">$ USD (Dollars)</option>
          <option value="€">€ EUR (Euros)</option>
          <option value="£">£ GBP (Pounds)</option>
        </select>
      </div>

      {/* PWA & Security Info */}
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
        <span>
          Split Up uses client-side IndexedDB persistence with Row Level Security (RLS) for privacy.
        </span>
      </div>
    </div>
  );
};
