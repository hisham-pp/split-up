'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import {
  setCurrency,
  toggleOfflineMode,
  CurrencySymbol,
} from '@/store/slices/uiSlice';
import { CURRENT_USER } from '@/store/api/expenseApi';
import { triggerHaptic } from '@/utils/haptics';
import {
  User,
  Wifi,
  WifiOff,
  DollarSign,
  Download,
  Moon,
  LogOut,
  ChevronRight,
  Shield,
  Smartphone,
  Check,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const dispatch = useDispatch();
  const { currency, isOffline, pendingSyncCount } = useSelector(
    (state: RootState) => state.ui
  );

  const currencies: { symbol: CurrencySymbol; name: string }[] = [
    { symbol: '₹', name: 'INR (Rupee)' },
    { symbol: '$', name: 'USD (Dollar)' },
    { symbol: '€', name: 'EUR (Euro)' },
    { symbol: '£', name: 'GBP (Pound)' },
  ];

  const handleExportData = () => {
    triggerHaptic(20);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ user: CURRENT_USER, timestamp: new Date().toISOString() })
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'splitup-expenses-export.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-6">
      {/* User Information Header Card */}
      <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <img
          src={CURRENT_USER.avatar}
          alt={CURRENT_USER.name}
          className="w-16 h-16 rounded-full object-cover ring-4 ring-indigo-500/20"
        />
        <div>
          <h2 className="text-xl font-bold text-white">{CURRENT_USER.name}</h2>
          <p className="text-xs text-slate-400">{CURRENT_USER.email}</p>
          <span className="inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PWA Standalone Active
          </span>
        </div>
      </div>

      {/* Offline Simulator Section */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
              {isOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-sm">
                Offline Mode Simulator
              </h3>
              <p className="text-xs text-slate-400">
                {isOffline
                  ? `Offline · ${pendingSyncCount} changes queued`
                  : 'Online & synchronized'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic(15);
              dispatch(toggleOfflineMode());
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isOffline
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isOffline ? 'Go Online' : 'Go Offline'}
          </button>
        </div>
      </div>

      {/* Currency Preference Selector */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Currency Preference
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {currencies.map((c) => {
            const isSelected = currency === c.symbol;
            return (
              <button
                key={c.symbol}
                onClick={() => {
                  triggerHaptic(10);
                  dispatch(setCurrency(c.symbol));
                }}
                className={`flex items-center justify-between p-3 rounded-2xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>
                  {c.symbol} ({c.name})
                </span>
                {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Export & Account Settings */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Data & Account
        </h3>

        <button
          onClick={handleExportData}
          className="flex items-center justify-between w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition-all"
        >
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export Data (JSON)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => triggerHaptic(10)}
          className="flex items-center justify-between w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 text-sm font-semibold transition-all"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </div>
        </button>
      </div>
    </div>
  );
};
