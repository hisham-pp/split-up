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
    <div className="max-w-3xl mx-auto pt-4 pb-8 animate-fade-in">
      {/* User Header */}
      <section className="flex flex-col items-center justify-center py-8 mb-6">
        <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 shadow-md ring-4 ring-surface-container-lowest">
          <img
            src={
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={user?.fullName || 'User'}
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-[22px] font-medium leading-[28px] text-on-surface">
          {user?.fullName || 'Guest User'}
        </h2>
        <p className="text-sm font-normal text-on-surface-variant mt-1">
          {user?.email || 'Offline mode active'}
        </p>
        
        {!isAuthenticated && (
          <button
            onClick={() => dispatch(openAuthModal('login'))}
            className="mt-4 px-6 py-2 bg-secondary-container text-on-secondary-container rounded-full text-sm font-medium transition-transform active:scale-95 hover:bg-surface-container-highest"
          >
            Sign In
          </button>
        )}
      </section>

      {/* Settings Content - Bento/Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preferences Section */}
        <section className="bg-surface-container-low rounded-[28px] p-4 flex flex-col gap-2">
          <h3 className="text-base font-medium text-primary px-2 pb-2 pt-1">Preferences</h3>
          
          <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-variant transition-colors group">
            <div className="flex items-center gap-4">
              <DollarSign className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-base font-normal text-on-surface">Currency</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currency}
                onChange={(e) => dispatch(setCurrency(e.target.value as any))}
                className="bg-transparent border-none text-sm text-on-surface-variant font-medium outline-none focus:ring-0 appearance-none text-right"
              >
                <option value="₹">INR (₹)</option>
                <option value="$">USD ($)</option>
                <option value="€">EUR (€)</option>
                <option value="£">GBP (£)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-variant transition-colors group">
            <div className="flex items-center gap-4">
              <Smartphone className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-base font-normal text-on-surface">Theme</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-on-surface-variant">System Default</span>
            </div>
          </div>
        </section>

        {/* Sync & System Section */}
        <section className="bg-surface-container-low rounded-[28px] p-4 flex flex-col gap-2">
          <h3 className="text-base font-medium text-primary px-2 pb-2 pt-1">Sync Engine</h3>
          
          <div 
            onClick={handleManualSync}
            className={`flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl transition-colors ${syncStatus.isSyncing ? 'opacity-70' : 'hover:bg-surface-variant cursor-pointer group'}`}
          >
            <div className="flex items-center gap-4">
              {syncStatus.isOnline ? (
                <Wifi className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              ) : (
                <WifiOff className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              )}
              <span className="text-base font-normal text-on-surface">
                {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-on-surface-variant font-medium">
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
              <RefreshCw className={`w-4 h-4 text-on-surface-variant ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-variant transition-colors group">
            <div className="flex items-center gap-4">
              <RefreshCw className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-base font-normal text-on-surface">Pending Queue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">
                {syncStatus.pendingQueueCount} items
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl hover:bg-surface-variant transition-colors group">
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-base font-normal text-on-surface">Cloud DB</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-on-surface-variant truncate max-w-[120px]">
                {isSupabaseConfigured ? 'Connected' : 'Local Only'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Logout Action */}
      {isAuthenticated && (
        <div className="mt-8 flex justify-center md:justify-end">
          <button
            onClick={() => dispatch(logout())}
            className="w-full md:w-auto flex items-center justify-center gap-2 p-4 bg-error-container text-on-error-container rounded-xl hover:bg-error hover:text-white transition-colors active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

