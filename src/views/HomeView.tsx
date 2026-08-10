'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveTab, setActiveGroup, openAddExpenseSheet } from '@/store/slices/uiSlice';
import { db, LocalGroup, LocalExpense, LocalGroupMember } from '@/lib/db/db';
import { processSyncQueue } from '@/lib/sync/syncEngine';
import { computeGroupBalances, toMajorUnits } from '@/lib/financial/financialEngine';
import { formatCurrency } from '@/utils/formatters';
import { SwipeableExpenseCard } from '@/components/ui/SwipeableExpenseCard';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { triggerHaptic } from '@/utils/haptics';
import {
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [groupBalancesMap, setGroupBalancesMap] = useState<Record<string, number>>({});
  const [totalGetBackCents, setTotalGetBackCents] = useState<number>(0);
  const [totalOweCents, setTotalOweCents] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    const activeGroups = await db.groups.filter((g) => !g.deletedAt).toArray();
    const activeExpenses = (await db.expenses.filter((e) => !e.deletedAt).toArray()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setGroups(activeGroups);
    setExpenses(activeExpenses);

    // Compute real balances for each group
    let getBack = 0;
    let owe = 0;
    const gBalMap: Record<string, number> = {};

    for (const g of activeGroups) {
      const gMembers = await db.groupMembers.where('groupId').equals(g.id).toArray();
      const memberIds = gMembers.map((m) => m.id);

      const gExp = await db.expenses
        .where('groupId')
        .equals(g.id)
        .filter((e) => e.deletedAt === null || e.deletedAt === undefined)
        .toArray();
      const expList = [];

      for (const e of gExp) {
        const payers = await db.expensePayers.where('expenseId').equals(e.id).toArray();
        const splits = await db.expenseSplits.where('expenseId').equals(e.id).toArray();
        expList.push({ payers, splits });
      }

      const gStl = await db.settlements
        .where('groupId')
        .equals(g.id)
        .filter((s) => s.deletedAt === null || s.deletedAt === undefined)
        .toArray();

      const computed = computeGroupBalances(memberIds, expList, gStl);

      // Find current user member record in group
      const myMember = gMembers.find(
        (m) => m.userId === currentUser?.id || m.memberName.toLowerCase() === currentUser?.fullName.toLowerCase()
      );

      const myNet = myMember ? computed[myMember.id]?.netBalance || 0 : 0;
      gBalMap[g.id] = myNet;

      if (myNet > 0) {
        getBack += myNet;
      } else if (myNet < 0) {
        owe += Math.abs(myNet);
      }
    }

    setGroupBalancesMap(gBalMap);
    setTotalGetBackCents(getBack);
    setTotalOweCents(owe);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleRefresh = async () => {
    await processSyncQueue();
    await loadData();
  };

  const netBalanceCents = totalGetBackCents - totalOweCents;

  const filteredExpenses = expenses.filter(
    (exp) =>
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 pb-6 animate-fade-in">
        {/* Net Balance Overview Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-950 p-6 border border-indigo-500/20 shadow-xl">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
            Total Net Balance
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {netBalanceCents >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(toMajorUnits(netBalanceCents)), currency)}
          </h2>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">You are owed</p>
                <p className="text-base font-bold text-emerald-400">
                  {formatCurrency(toMajorUnits(totalGetBackCents), currency)}
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
                  {formatCurrency(toMajorUnits(totalOweCents), currency)}
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
              <span>See all ({groups.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {groups.map((group) => {
              const netBal = groupBalancesMap[group.id] || 0;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    triggerHaptic(10);
                    dispatch(setActiveGroup(group as any));
                  }}
                  className="flex items-center gap-3 p-3 min-w-[200px] rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 shrink-0 text-left transition-all active:scale-95"
                >
                  <img
                    src={
                      group.coverImage ||
                      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={group.name}
                    className="w-11 h-11 rounded-xl object-cover ring-1 ring-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-200 text-sm truncate">
                      {group.name}
                    </h4>
                    <p
                      className={`text-xs font-semibold ${
                        netBal > 0
                          ? 'text-emerald-400'
                          : netBal < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {netBal > 0
                        ? `Get ${formatCurrency(toMajorUnits(netBal), currency)}`
                        : netBal < 0
                        ? `Owe ${formatCurrency(toMajorUnits(Math.abs(netBal)), currency)}`
                        : 'Settled'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expenses Feed with Search & Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-100">Recent Expenses</h3>
            <span className="text-xs text-slate-400">Swipe to manage</span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            {mounted ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses by title or category..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            ) : (
              <div className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl" />
            )}
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium text-slate-400">No expenses found</p>
              <button
                onClick={() => dispatch(openAddExpenseSheet())}
                className="mt-3 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md"
              >
                + Add expense
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((expense) => (
                <SwipeableExpenseCard
                  key={expense.id}
                  expense={{
                    id: expense.id,
                    groupId: expense.groupId,
                    groupName: groups.find((g) => g.id === expense.groupId)?.name || 'Group',
                    title: expense.title,
                    amount: toMajorUnits(expense.amountCents),
                    paidBy: {
                      id: currentUser?.id || 'usr_user',
                      name: currentUser?.fullName || 'User',
                      avatar: currentUser?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=6366f1',
                      email: currentUser?.email || 'user@example.com',
                    },
                    date: expense.date,
                    category: expense.category as any,
                    splitMode: expense.splitMode as any,
                    splitBetween: [],
                    notes: expense.notes,
                  }}
                  onDeleted={() => loadData()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
};
