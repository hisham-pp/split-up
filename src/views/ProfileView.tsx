'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setCurrency } from '@/store/slices/uiSlice';
import { openAuthModal, logout } from '@/store/slices/authSlice';
import { subscribeSyncStatus, processSyncQueue, SyncStatus } from '@/lib/sync/syncEngine';
import { isSupabaseConfigured } from '@/lib/supabase/supabase';
import { supabase } from '@/lib/supabase/supabase';
import { db } from '@/lib/db/db';
import { toValidUuid } from '@/lib/sync/syncEngine';
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
  Trash2,
  AlertTriangle,
  X,
  CheckCircle,
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

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearStep, setClearStep] = useState<'confirm' | 'clearing' | 'done'>('confirm');
  const [clearLog, setClearLog] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    await processSyncQueue();
  };

  const handleClearData = async () => {
    setClearStep('clearing');
    const log: string[] = [];

    try {
      // 1. Clear local IndexedDB (except auth-related profiles)
      log.push('Clearing local groups…');
      setClearLog([...log]);
      await db.groups.clear();

      log.push('Clearing local group members…');
      setClearLog([...log]);
      await db.groupMembers.clear();

      log.push('Clearing local expenses…');
      setClearLog([...log]);
      await db.expenses.clear();

      log.push('Clearing local expense payers…');
      setClearLog([...log]);
      await db.expensePayers.clear();

      log.push('Clearing local expense splits…');
      setClearLog([...log]);
      await db.expenseSplits.clear();

      log.push('Clearing local settlements…');
      setClearLog([...log]);
      await db.settlements.clear();

      log.push('Clearing sync queue…');
      setClearLog([...log]);
      await db.syncQueue.clear();

      // 2. If authenticated, also clear from Supabase
      if (isAuthenticated && isSupabaseConfigured && supabase && user?.id) {
        const userUuid = toValidUuid(user.id);

        log.push('Deleting your groups from cloud database…');
        setClearLog([...log]);
        await supabase.from('groups').delete().eq('created_by', userUuid);

        log.push('Deleting your expenses from cloud database…');
        setClearLog([...log]);
        await supabase.from('expenses').delete().eq('created_by', userUuid);

        log.push('Deleting your settlements from cloud database…');
        setClearLog([...log]);
        await supabase.from('settlements').delete().eq('created_by', userUuid);
      } else {
        log.push('Skipped cloud delete (not logged in or Supabase not configured).');
        setClearLog([...log]);
      }

      log.push('✓ All data cleared successfully!');
      setClearLog([...log]);
      setClearStep('done');
    } catch (err: any) {
      log.push(`✗ Error: ${err?.message || 'Unknown error'}`);
      setClearLog([...log]);
      setClearStep('done');
    }
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

      {/* Settings Content */}
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

        {/* Danger Zone */}
        <section className="bg-error-container/10 border border-error/20 rounded-[28px] p-4 flex flex-col gap-2 md:col-span-2">
          <h3 className="text-base font-medium text-error px-2 pb-2 pt-1">Danger Zone</h3>
          
          <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl">
            <div className="flex items-center gap-4">
              <Trash2 className="w-5 h-5 text-error" />
              <div>
                <p className="text-base font-normal text-on-surface">Clear All Data</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Removes all groups, expenses & members from local storage{isAuthenticated ? ' and cloud database' : ''}. Your login info is preserved.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setShowClearModal(true); setClearStep('confirm'); setClearLog([]); }}
              className="px-4 py-2 rounded-full bg-error text-on-error text-sm font-medium transition-all active:scale-95 hover:bg-error/90 shrink-0 ml-4"
            >
              Clear
            </button>
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

      {/* Clear Data Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-[28px] p-6 shadow-xl">
            {clearStep === 'confirm' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-error-container flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-error" />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-medium text-on-surface">Clear All Data?</h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">This cannot be undone</p>
                  </div>
                </div>

                <div className="bg-surface-container rounded-2xl p-4 mb-6 space-y-2">
                  <p className="text-sm font-medium text-on-surface mb-3">The following will be permanently deleted:</p>
                  {[
                    'All groups',
                    'All group members',
                    'All expenses & splits',
                    'All settlements',
                    'Sync queue',
                    isAuthenticated ? 'Your cloud database records' : null,
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Trash2 className="w-3.5 h-3.5 text-error shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-outline/10 flex items-center gap-2 text-sm text-primary font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Your login session will be kept</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearModal(false)}
                    className="flex-1 h-12 rounded-full bg-surface-container text-on-surface font-medium text-sm transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    className="flex-1 h-12 rounded-full bg-error text-on-error font-medium text-sm transition-all active:scale-95 hover:bg-error/90 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Yes, Clear All
                  </button>
                </div>
              </>
            )}

            {clearStep === 'clearing' && (
              <div className="text-center py-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h2 className="text-[18px] font-medium text-on-surface mb-4">Clearing data…</h2>
                <div className="space-y-2 text-left max-h-48 overflow-y-auto">
                  {clearLog.map((line, i) => (
                    <p key={i} className="text-xs text-on-surface-variant font-mono">{line}</p>
                  ))}
                </div>
              </div>
            )}

            {clearStep === 'done' && (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-on-primary-container" />
                </div>
                <h2 className="text-[20px] font-medium text-on-surface mb-2">Done!</h2>
                <p className="text-sm text-on-surface-variant mb-6">All data has been cleared.</p>
                <div className="space-y-1 text-left mb-6 max-h-48 overflow-y-auto">
                  {clearLog.map((line, i) => (
                    <p key={i} className="text-xs text-on-surface-variant font-mono">{line}</p>
                  ))}
                </div>
                <button
                  onClick={() => setShowClearModal(false)}
                  className="w-full h-12 rounded-full bg-primary text-on-primary font-medium text-sm transition-all active:scale-95"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
