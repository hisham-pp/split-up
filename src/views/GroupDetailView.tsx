'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveGroup, openAddExpenseSheet } from '@/store/slices/uiSlice';
import { db, LocalGroup, LocalExpense, LocalGroupMember, LocalSettlement } from '@/lib/db/db';
import { computeGroupBalances, toMajorUnits } from '@/lib/financial/financialEngine';
import { simplifyDebts, SimplifiedTransaction } from '@/lib/financial/debtSimplifier';
import { formatCurrency } from '@/utils/formatters';
import { SettleUpModal } from '@/components/modals/SettleUpModal';
import { InviteModal } from '@/components/modals/InviteModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { GroupModal } from '@/components/modals/GroupModal';
import { SwipeableExpenseCard } from '@/components/ui/SwipeableExpenseCard';
import { triggerHaptic } from '@/utils/haptics';
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Share2,
  Download,
  Edit,
  Users,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

interface GroupDetailViewProps {
  group: LocalGroup;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group }) => {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [members, setMembers] = useState<LocalGroupMember[]>([]);
  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [settlements, setSettlements] = useState<LocalSettlement[]>([]);
  const [balances, setBalances] = useState<Record<string, { totalPaid: number; totalOwed: number; netBalance: number }>>({});
  const [simplifiedTxs, setSimplifiedTxs] = useState<SimplifiedTransaction[]>([]);

  // Modals
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);

  const loadGroupDetails = async () => {
    const gMembers = await db.groupMembers.where('groupId').equals(group.id).toArray();
    setMembers(gMembers);

    const gExpenses = await db.expenses
      .where('groupId')
      .equals(group.id)
      .filter((e) => e.deletedAt === null || e.deletedAt === undefined)
      .reverse()
      .sortBy('date');
    setExpenses(gExpenses);

    const gSettlements = await db.settlements
      .where('groupId')
      .equals(group.id)
      .filter((s) => s.deletedAt === null || s.deletedAt === undefined)
      .toArray();
    setSettlements(gSettlements);

    // Build calculations input
    const memberIds = gMembers.map((m) => m.id);
    const expCalculationsList = [];

    for (const e of gExpenses) {
      const payers = await db.expensePayers.where('expenseId').equals(e.id).toArray();
      const splits = await db.expenseSplits.where('expenseId').equals(e.id).toArray();
      expCalculationsList.push({ payers, splits });
    }

    const computedBalances = computeGroupBalances(memberIds, expCalculationsList, gSettlements);
    setBalances(computedBalances);

    // Calculate simplified debts
    const netBalMap: Record<string, number> = {};
    Object.entries(computedBalances).forEach(([mId, info]) => {
      netBalMap[mId] = info.netBalance;
    });

    const simplified = simplifyDebts(netBalMap);
    setSimplifiedTxs(simplified);
  };

  useEffect(() => {
    loadGroupDetails();
    const interval = setInterval(loadGroupDetails, 3000);
    return () => clearInterval(interval);
  }, [group.id]);

  const getMemberName = (id: string) => {
    const m = members.find((mem) => mem.id === id);
    if (!m) return 'Member';
    return m.userId && m.userId === currentUser?.id ? 'You' : m.memberName;
  };

  const totalGroupSpendCents = expenses.reduce((acc, e) => acc + e.amountCents, 0);

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Group Detail Banner Header */}
      <div className="relative rounded-b-[32px] overflow-hidden bg-surface-container-low shadow-sm -mt-4 mx-[-16px]">
        <div className="h-40 sm:h-52 w-full relative">
          <img
            src={
              group.coverImage ||
              'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
            }
            alt={group.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/40 to-transparent" />

          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsEditGroupModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/60 text-on-surface hover:bg-surface-container backdrop-blur-md transition-all active:scale-95"
              title="Edit Group"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/60 text-on-surface hover:bg-surface-container backdrop-blur-md transition-all active:scale-95"
              title="Invite Members"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 relative z-10">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-widest border border-outline/10">
                  {group.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest border border-outline/10 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {members.length} members
                </span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] leading-tight font-medium text-on-surface tracking-tight mb-1">
                {group.name}
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">
                Total Spend: {formatCurrency(toMajorUnits(totalGroupSpendCents), currency)}
              </p>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  triggerHaptic(10);
                  dispatch(openAddExpenseSheet());
                }}
                className="flex-1 h-12 rounded-full bg-primary text-on-primary font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>

              <button
                onClick={() => setIsSettleModalOpen(true)}
                className="px-6 h-12 rounded-full bg-primary-container text-on-primary-container text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Settle</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface transition-all active:scale-95"
                title="Export Data"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Debts Recommendation Banner */}
      {simplifiedTxs.length > 0 && (
        <div className="p-5 rounded-2xl bg-surface-container-low space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Smart Settle</span>
            </h3>
            <span className="text-[11px] text-on-surface-variant font-medium">{simplifiedTxs.length} payments</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {simplifiedTxs.map((tx, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-surface-container flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-on-surface">{getMemberName(tx.fromMemberId)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span className="font-medium text-on-surface">{getMemberName(tx.toMemberId)}</span>
                </div>
                <span className="font-medium text-primary text-sm">
                  {formatCurrency(toMajorUnits(tx.amountCents), currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Members & Individual Net Balances */}
      <div className="p-5 rounded-2xl bg-surface-container-low">
        <h3 className="text-base font-semibold text-on-surface mb-3">Group Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m) => {
            const balInfo = balances[m.id] || { totalPaid: 0, totalOwed: 0, netBalance: 0 };
            const netMajor = toMajorUnits(balInfo.netBalance);

            return (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-surface-container flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      m.memberAvatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={m.memberName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {m.userId && m.userId === currentUser?.id ? 'You' : m.memberName}
                    </p>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Paid {formatCurrency(toMajorUnits(balInfo.totalPaid), currency)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      netMajor > 0
                        ? 'text-positive'
                        : netMajor < 0
                        ? 'text-negative'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {netMajor > 0
                      ? `+${formatCurrency(netMajor, currency)}`
                      : netMajor < 0
                      ? `${formatCurrency(netMajor, currency)}`
                      : 'Settled'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses History List */}
      <div className="bg-surface-container-low rounded-2xl flex flex-col overflow-hidden pb-4">
        <h3 className="text-lg font-medium text-on-surface p-4 pb-2">Group Expenses ({expenses.length})</h3>

        {expenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-on-surface-variant">No expenses recorded in this group yet</p>
            <button
              onClick={() => dispatch(openAddExpenseSheet())}
              className="mt-3 text-xs font-medium px-4 py-2 rounded-full bg-primary-container text-on-primary-container transition-all"
            >
              + Add first expense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <SwipeableExpenseCard
                key={expense.id}
                expense={{
                  id: expense.id,
                  groupId: expense.groupId,
                  groupName: group.name,
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
                onDeleted={() => loadGroupDetails()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        group={group}
        members={members}
        simplifiedTransactions={simplifiedTxs}
        onSettled={() => loadGroupDetails()}
        currency={currency}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        group={group}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        group={group}
        members={members}
        expenses={expenses}
        settlements={settlements}
        balances={balances}
        currency={currency}
      />

      <GroupModal
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        groupToEdit={group}
        onGroupSaved={() => loadGroupDetails()}
        currentUserId={currentUser?.id || 'usr_hisham'}
      />
    </div>
  );
};
