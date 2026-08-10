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
        {/* Hero Card */}
        <section className="bg-primary-container rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden">
          <div className="text-base font-medium text-on-primary-container opacity-90 relative z-10">
            Total Balance
          </div>
          <div className="text-5xl font-normal text-on-primary-container tracking-tight relative z-10">
            {netBalanceCents >= 0 ? '' : '-'}
            {formatCurrency(Math.abs(toMajorUnits(netBalanceCents)), currency)}
          </div>
          <div className="text-sm font-normal text-on-primary-container opacity-80 relative z-10">
            You are owed {formatCurrency(toMajorUnits(totalGetBackCents), currency)} • You owe {formatCurrency(toMajorUnits(totalOweCents), currency)}
          </div>
          <button 
            className="mt-2 w-max bg-surface text-primary font-medium text-sm rounded-full px-6 py-2 shadow-sm hover:opacity-90 active:scale-95 transition-all relative z-10"
            onClick={() => dispatch(setActiveTab('groups'))}
          >
            Settle Up
          </button>
        </section>

        {/* Quick Action Grid */}
        <section className="grid grid-cols-4 gap-4">
          {[
            { icon: 'group_add', label: 'Add Group', action: () => dispatch(setActiveTab('groups')) },
            { icon: 'payments', label: 'Settle', action: () => dispatch(setActiveTab('groups')) },
            { icon: 'document_scanner', label: 'Scan Bill', action: () => dispatch(openAddExpenseSheet()) },
            { icon: 'ios_share', label: 'Export', action: () => {} },
          ].map((item, idx) => (
            <div key={idx} onClick={item.action} className="flex flex-col items-center gap-1 cursor-pointer group">
              <div className="w-14 h-14 bg-surface-container hover:bg-surface-container-high transition-colors rounded-xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" style={{ fontFamily: "'Material Symbols Outlined'" }}>{item.icon}</span>
              </div>
              <span className="text-xs font-medium text-on-surface text-center mt-1">{item.label}</span>
            </div>
          ))}
        </section>

        {/* Quick Group Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-on-surface">Your Groups</h3>
            <button
              onClick={() => {
                triggerHaptic(10);
                dispatch(setActiveTab('groups'));
              }}
              className="text-xs font-semibold text-primary hover:text-on-surface flex items-center gap-1"
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
                  className="flex items-center gap-3 p-3 min-w-[200px] rounded-lg bg-surface-container hover:bg-surface-variant border border-outline/20 shrink-0 text-left transition-all active:scale-95"
                >
                  <img
                    src={
                      group.coverImage ||
                      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={group.name}
                    className="w-11 h-11 rounded-md object-cover border border-outline/20"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-on-surface text-sm truncate">
                      {group.name}
                    </h4>
                    <p
                      className={`text-xs font-bold ${
                        netBal > 0
                          ? 'text-primary'
                          : netBal < 0
                          ? 'text-error'
                          : 'text-on-surface-variant'
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

        {/* Expenses Feed */}
        <div className="bg-surface-container-low rounded-2xl flex flex-col overflow-hidden pb-4">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="text-lg font-medium text-on-surface">Recent Activity</h3>
            <span className="text-xs text-on-surface-variant">Swipe to manage</span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-outline" />
            {mounted ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses by title or category..."
                className="w-full bg-surface-container border border-outline/30 rounded-md pl-10 pr-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            ) : (
              <div className="w-full h-9 bg-surface-container border border-outline/30 rounded-md" />
            )}
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center bg-surface-container rounded-lg border border-outline/20">
              <Sparkles className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
              <p className="text-sm font-medium text-on-surface-variant">No expenses found</p>
              <button
                onClick={() => dispatch(openAddExpenseSheet())}
                className="mt-3 text-xs font-bold px-4 py-2 rounded-md bg-primary text-on-primary hover:bg-surface-variant hover:text-on-surface border border-outline/30 transition-all"
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
