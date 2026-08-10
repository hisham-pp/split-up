'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { openAddExpenseSheet } from '@/store/slices/uiSlice';
import {
  Group,
  useGetExpensesQuery,
  useSettleBalanceMutation,
  CURRENT_USER,
} from '@/store/api/expenseApi';
import { formatCurrency } from '@/utils/formatters';
import { SwipeableExpenseCard } from '@/components/ui/SwipeableExpenseCard';
import { triggerHaptic } from '@/utils/haptics';
import confetti from 'canvas-confetti';
import {
  Users,
  Plus,
  CheckCircle2,
  PieChart,
  Receipt,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface GroupDetailViewProps {
  group: Group;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group }) => {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const [activeSegment, setActiveSegment] = useState<'overview' | 'expenses' | 'balances'>('overview');
  const { data: expenses = [] } = useGetExpensesQuery(group.id);
  const [settleBalance] = useSettleBalanceMutation();

  const handleSettleUp = async () => {
    triggerHaptic([40, 80, 40]);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    await settleBalance({ groupId: group.id, amount: Math.abs(group.userNetBalance) });
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Group Net Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Your Net Balance
            </p>
            <h2
              className={`text-3xl font-extrabold tracking-tight ${
                group.userNetBalance > 0
                  ? 'text-emerald-400'
                  : group.userNetBalance < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {group.userNetBalance > 0
                ? `You get ${formatCurrency(group.userNetBalance, currency)}`
                : group.userNetBalance < 0
                ? `You owe ${formatCurrency(Math.abs(group.userNetBalance), currency)}`
                : 'Settled Up'}
            </h2>
          </div>

          {group.userNetBalance !== 0 && (
            <button
              onClick={handleSettleUp}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Settle Up
            </button>
          )}
        </div>

        {/* Group Members Avatars */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800">
          <div className="flex -space-x-2">
            {group.members.map((m) => (
              <img
                key={m.id}
                src={m.avatar}
                alt={m.name}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-900"
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium ml-1">
            {group.members.map((m) => (m.isCurrentUser ? 'You' : m.name)).join(', ')}
          </span>
        </div>
      </div>

      {/* Segmented Control Navigation (Overview | Expenses | Balances) */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-900 border border-slate-800">
        {(['overview', 'expenses', 'balances'] as const).map((segment) => (
          <button
            key={segment}
            onClick={() => {
              triggerHaptic(10);
              setActiveSegment(segment);
            }}
            className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              activeSegment === segment
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {segment}
          </button>
        ))}
      </div>

      {/* Segment Content */}
      {activeSegment === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Total Group Spend</p>
              <p className="text-lg font-bold text-white mt-1">
                {formatCurrency(group.totalSpend, currency)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400">Total Expenses</p>
              <p className="text-lg font-bold text-white mt-1">
                {expenses.length} items
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200">Recent Expenses</h3>
              <button
                onClick={() => setActiveSegment('expenses')}
                className="text-xs text-indigo-400 font-semibold"
              >
                View all
              </button>
            </div>
            <div className="space-y-1">
              {expenses.slice(0, 3).map((exp) => (
                <SwipeableExpenseCard key={exp.id} expense={exp} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSegment === 'expenses' && (
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No expenses added yet to this group.
            </div>
          ) : (
            expenses.map((exp) => (
              <SwipeableExpenseCard key={exp.id} expense={exp} />
            ))
          )}
        </div>
      )}

      {activeSegment === 'balances' && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Group Balances Breakdown</h3>
          {group.members.map((m) => {
            const isUser = m.isCurrentUser;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800"
                  />
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">
                      {isUser ? 'You' : m.name}
                    </h4>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold text-sm ${
                      isUser && group.userNetBalance > 0
                        ? 'text-emerald-400'
                        : isUser && group.userNetBalance < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {isUser
                      ? group.userNetBalance > 0
                        ? `Gets ${formatCurrency(group.userNetBalance, currency)}`
                        : group.userNetBalance < 0
                        ? `Owes ${formatCurrency(Math.abs(group.userNetBalance), currency)}`
                        : 'Settled'
                      : 'Settled'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
