'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveTab, setActiveGroup, openAddExpenseSheet } from '@/store/slices/uiSlice';
import {
  useGetGroupsQuery,
  useGetExpensesQuery,
  useGetActivityQuery,
} from '@/store/api/expenseApi';
import { formatCurrency } from '@/utils/formatters';
import { SwipeableExpenseCard } from '@/components/ui/SwipeableExpenseCard';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { triggerHaptic } from '@/utils/haptics';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Users,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const { data: groups = [], refetch: refetchGroups } = useGetGroupsQuery();
  const { data: expenses = [], refetch: refetchExpenses } = useGetExpensesQuery(undefined);

  const totalGetBack = groups
    .filter((g) => g.userNetBalance > 0)
    .reduce((acc, g) => acc + g.userNetBalance, 0);

  const totalOwe = groups
    .filter((g) => g.userNetBalance < 0)
    .reduce((acc, g) => acc + Math.abs(g.userNetBalance), 0);

  const netBalance = totalGetBack - totalOwe;

  const handleRefresh = async () => {
    await Promise.all([refetchGroups(), refetchExpenses()]);
  };

  const handleGroupSelect = (group: any) => {
    triggerHaptic(10);
    dispatch(setActiveGroup(group));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-6">
        {/* Net Balance Overview Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 p-6 border border-indigo-500/20 shadow-xl">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
            Total Net Balance
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {netBalance >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(netBalance), currency)}
          </h2>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">You are owed</p>
                <p className="text-base font-bold text-emerald-400">
                  {formatCurrency(totalGetBack, currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">You owe</p>
                <p className="text-base font-bold text-rose-400">
                  {formatCurrency(totalOwe, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Group Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-100">Your Groups</h3>
            <button
              onClick={() => {
                triggerHaptic(10);
                dispatch(setActiveTab('groups'));
              }}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>See all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupSelect(group)}
                className="flex items-center gap-3 p-3 min-w-[200px] rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 shrink-0 text-left transition-all active:scale-95"
              >
                <img
                  src={group.coverImage}
                  alt={group.name}
                  className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-200 text-sm truncate">
                    {group.name}
                  </h4>
                  <p
                    className={`text-xs font-semibold ${
                      group.userNetBalance > 0
                        ? 'text-emerald-400'
                        : group.userNetBalance < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {group.userNetBalance > 0
                      ? `Get ${formatCurrency(group.userNetBalance, currency)}`
                      : group.userNetBalance < 0
                      ? `Owe ${formatCurrency(Math.abs(group.userNetBalance), currency)}`
                      : 'Settled'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity Expenses Feed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-100">Recent Expenses</h3>
            <span className="text-xs text-slate-400">Swipe left to edit / delete</span>
          </div>

          {expenses.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium text-slate-400">No expenses recorded yet</p>
              <button
                onClick={() => dispatch(openAddExpenseSheet())}
                className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 text-white"
              >
                + Add your first expense
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {expenses.map((expense) => (
                <SwipeableExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
};
