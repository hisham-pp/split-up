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
    return m ? m.memberName : 'Member';
  };

  const totalGroupSpendCents = expenses.reduce((acc, e) => acc + e.amountCents, 0);

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Group Detail Banner Header */}
      <div className="relative rounded-lg overflow-hidden bg-surface-container border border-outline/20">
        <div className="h-36 sm:h-44 w-full relative">
          <img
            src={
              group.coverImage ||
              'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
            }
            alt={group.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <button
            onClick={() => {
              triggerHaptic(10);
              dispatch(setActiveGroup(null));
            }}
            className="absolute top-4 left-4 p-2.5 rounded-md bg-surface/70 text-on-surface hover:bg-surface border border-outline/20 backdrop-blur-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsEditGroupModalOpen(true)}
              className="p-2.5 rounded-md bg-surface/70 text-on-surface hover:bg-surface border border-outline/20 backdrop-blur-md"
              title="Edit Group"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="p-2.5 rounded-md bg-surface/70 text-on-surface hover:bg-surface border border-outline/20 backdrop-blur-md"
              title="Invite Members"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 -mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-sm bg-surface-variant text-on-surface border border-outline/20 text-xs font-bold uppercase tracking-wider">
                {group.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-2">
                {group.name}
              </h1>
              <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-2 font-medium">
                <Users className="w-3.5 h-3.5" />
                <span>{members.length} members</span>
                <span>•</span>
                <span>Total Spend: {formatCurrency(toMajorUnits(totalGroupSpendCents), currency)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  triggerHaptic(10);
                  dispatch(openAddExpenseSheet());
                }}
                className="px-4 py-2.5 rounded-md bg-primary hover:bg-surface-variant text-on-primary hover:text-on-surface border border-outline/30 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>

              <button
                onClick={() => setIsSettleModalOpen(true)}
                className="px-4 py-2.5 rounded-md bg-surface-container hover:bg-surface-variant border border-outline/30 text-on-surface text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Settle Up</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="p-2.5 rounded-md bg-surface-container hover:bg-surface-variant border border-outline/30 text-on-surface transition-all"
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
        <div className="p-5 rounded-lg bg-surface-container border border-outline/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-on-surface-variant" />
              <span>Simplified Debt Settlement Plan</span>
            </h3>
            <span className="text-[11px] text-on-surface-variant font-medium">{simplifiedTxs.length} payments to settle group</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {simplifiedTxs.map((tx, idx) => (
              <div
                key={idx}
                className="p-3 rounded-md bg-background border border-outline/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-on-surface">{getMemberName(tx.fromMemberId)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span className="font-bold text-on-surface">{getMemberName(tx.toMemberId)}</span>
                </div>
                <span className="font-bold text-primary text-xs">
                  {formatCurrency(toMajorUnits(tx.amountCents), currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Members & Individual Net Balances */}
      <div className="p-5 rounded-lg bg-surface-container border border-outline/20">
        <h3 className="text-sm font-bold text-on-surface mb-3">Group Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((m) => {
            const balInfo = balances[m.id] || { totalPaid: 0, totalOwed: 0, netBalance: 0 };
            const netMajor = toMajorUnits(balInfo.netBalance);

            return (
              <div
                key={m.id}
                className="p-3.5 rounded-md bg-background border border-outline/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      m.memberAvatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={m.memberName}
                    className="w-9 h-9 rounded-md object-cover border border-outline/30"
                  />
                  <div>
                    <p className="text-xs font-bold text-on-surface">{m.memberName}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      Paid {formatCurrency(toMajorUnits(balInfo.totalPaid), currency)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-xs font-bold ${
                      netMajor > 0
                        ? 'text-primary'
                        : netMajor < 0
                        ? 'text-error'
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
      <div>
        <h3 className="text-base font-bold text-on-surface mb-3">Group Expenses ({expenses.length})</h3>

        {expenses.length === 0 ? (
          <div className="p-8 text-center bg-surface-container rounded-lg border border-outline/20">
            <p className="text-sm font-medium text-on-surface-variant">No expenses recorded in this group yet</p>
            <button
              onClick={() => dispatch(openAddExpenseSheet())}
              className="mt-3 text-xs font-bold px-4 py-2 rounded-md bg-primary text-on-primary hover:bg-surface-variant hover:text-on-surface border border-outline/30 transition-all"
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
