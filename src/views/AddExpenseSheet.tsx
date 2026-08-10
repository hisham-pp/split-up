'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { closeAddExpenseSheet } from '@/store/slices/uiSlice';
import { db, LocalExpense, LocalExpensePayer, LocalExpenseSplit, LocalGroup, LocalGroupMember } from '@/lib/db/db';
import { queueMutation } from '@/lib/sync/syncEngine';
import { toMinorUnits, calculateExpenseSplits, SplitMode } from '@/lib/financial/financialEngine';
import { triggerHaptic } from '@/utils/haptics';
import {
  X,
  Plus,
  Calendar,
  Tag,
  Users,
  Percent,
  Check,
  AlertCircle,
  FileText,
  PieChart,
} from 'lucide-react';

export const AddExpenseSheet: React.FC = () => {
  const dispatch = useDispatch();
  const isSheetOpen = useSelector((state: RootState) => state.ui.addExpenseSheetOpen);
  const activeGroup = useSelector((state: RootState) => state.ui.activeGroup);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<LocalExpense['category']>('Food');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState<SplitMode>('Equal');
  const [notes, setNotes] = useState('');

  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [members, setMembers] = useState<LocalGroupMember[]>([]);

  // Split configurations
  const [selectedPayerId, setSelectedPayerId] = useState<string>('');
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState<string[]>([]);
  const [exactSplits, setExactSplits] = useState<Record<string, number>>({});
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [shares, setShares] = useState<Record<string, number>>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load groups from IndexedDB
  useEffect(() => {
    async function loadGroups() {
      const gList = await db.groups.filter((g) => !g.deletedAt).toArray();
      setGroups(gList);
      if (activeGroup) {
        setSelectedGroupId(activeGroup.id);
      } else if (gList.length > 0) {
        setSelectedGroupId(gList[0].id);
      }
    }
    if (isSheetOpen) {
      loadGroups();
    }
  }, [isSheetOpen, activeGroup]);

  // Load group members when selectedGroupId changes
  useEffect(() => {
    async function loadMembers() {
      if (!selectedGroupId) return;
      const mList = await db.groupMembers.where('groupId').equals(selectedGroupId).toArray();
      setMembers(mList);
      if (mList.length > 0) {
        setSelectedPayerId(mList[0].id);
        const allIds = mList.map((m) => m.id);
        setSelectedSplitMemberIds(allIds);

        // Reset split maps
        const defaultExact: Record<string, number> = {};
        const defaultPct: Record<string, number> = {};
        const defaultShares: Record<string, number> = {};

        const equalPct = Number((100 / mList.length).toFixed(2));
        mList.forEach((m) => {
          defaultExact[m.id] = 0;
          defaultPct[m.id] = equalPct;
          defaultShares[m.id] = 1;
        });

        setExactSplits(defaultExact);
        setPercentages(defaultPct);
        setShares(defaultShares);
      }
    }
    loadMembers();
  }, [selectedGroupId]);

  if (!isSheetOpen) return null;

  const toggleSplitMember = (memberId: string) => {
    if (selectedSplitMemberIds.includes(memberId)) {
      if (selectedSplitMemberIds.length === 1) return; // Must keep at least one
      setSelectedSplitMemberIds(selectedSplitMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedSplitMemberIds([...selectedSplitMemberIds, memberId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid positive expense amount.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Expense title is required.');
      return;
    }
    if (!selectedGroupId) {
      setErrorMsg('Please select a group.');
      return;
    }

    setIsSubmitting(true);

    try {
      const amountCents = toMinorUnits(parsedAmount);

      // Convert exactSplits to minor units for calculation
      const exactSplitsCents: Record<string, number> = {};
      Object.entries(exactSplits).forEach(([id, val]) => {
        exactSplitsCents[id] = toMinorUnits(val || 0);
      });

      const calculationResult = calculateExpenseSplits({
        totalAmountCents: amountCents,
        payers: [{ memberId: selectedPayerId, amountCents }],
        splitMode,
        splitBetweenIds: selectedSplitMemberIds,
        exactSplits: exactSplitsCents,
        percentages,
        shares,
      });

      const now = new Date().toISOString();
      const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const newExpense: LocalExpense = {
        id: expenseId,
        groupId: selectedGroupId,
        title: title.trim(),
        amountCents,
        category,
        splitMode,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      const payersData: LocalExpensePayer[] = [
        {
          id: `pay_${Date.now()}_1`,
          expenseId,
          memberId: selectedPayerId,
          amountCents,
        },
      ];

      const splitsData: LocalExpenseSplit[] = calculationResult.splits.map((s, idx) => ({
        id: `split_${Date.now()}_${idx}`,
        expenseId,
        memberId: s.memberId,
        amountCents: s.amountCents,
        percentage: s.percentage,
        shares: s.shares,
      }));

      // Store in IndexedDB
      await db.expenses.put(newExpense);
      await db.expensePayers.bulkPut(payersData);
      await db.expenseSplits.bulkPut(splitsData);

      // Queue for Supabase Sync
      await queueMutation('CREATE_EXPENSE', {
        expense: newExpense,
        payers: payersData,
        splits: splitsData,
      });

      triggerHaptic(20);
      dispatch(closeAddExpenseSheet());

      // Reset form
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/95 animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border-t sm:border border-outline/30 rounded-t-lg sm:rounded-lg p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => dispatch(closeAddExpenseSheet())}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-variant transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <span>Add New Expense</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-1 font-medium">
            Record a shared expense and split it with group members
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Group
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-surface-container border border-outline/30 rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Seafood Dinner at Britto's"
              className="w-full bg-surface-container border border-outline/30 rounded-md px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-container border border-outline/30 rounded-md px-4 py-2.5 text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-surface-container border border-outline/30 rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="Food">Food & Drinks</option>
                <option value="Travel">Travel & Transport</option>
                <option value="Housing">Accommodation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Paid By
            </label>
            <select
              value={selectedPayerId}
              onChange={(e) => setSelectedPayerId(e.target.value)}
              className="w-full bg-surface-container border border-outline/30 rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              Split Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Equal', 'Unequal', 'Percentage', 'Shares'] as SplitMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className={`py-2 rounded-md text-xs font-bold transition-all border ${
                    splitMode === mode
                      ? 'bg-primary border-primary text-on-primary'
                      : 'bg-surface-container border-outline/30 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              Split Between ({selectedSplitMemberIds.length} members)
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {members.map((m) => {
                const isSelected = selectedSplitMemberIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleSplitMember(m.id)}
                    className={`p-3 rounded-md border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-surface border-primary text-on-surface'
                        : 'bg-surface-container border-outline/30 text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-sm flex items-center justify-center border ${
                          isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-bold">{m.memberName}</span>
                    </div>

                    {isSelected && splitMode === 'Unequal' && (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Exact ₹"
                        value={exactSplits[m.id] || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setExactSplits({
                            ...exactSplits,
                            [m.id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24 bg-surface-container border border-outline/30 rounded-md px-2 py-1 text-xs text-on-surface font-bold text-right outline-none focus:border-primary"
                      />
                    )}

                    {isSelected && splitMode === 'Percentage' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="%"
                          value={percentages[m.id] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setPercentages({
                              ...percentages,
                              [m.id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 bg-surface-container border border-outline/30 rounded-md px-2 py-1 text-xs text-on-surface font-bold text-right outline-none focus:border-primary"
                        />
                        <span className="text-xs text-on-surface-variant">%</span>
                      </div>
                    )}

                    {isSelected && splitMode === 'Shares' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          placeholder="Shares"
                          value={shares[m.id] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setShares({
                              ...shares,
                              [m.id]: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-16 bg-surface-container border border-outline/30 rounded-md px-2 py-1 text-xs text-on-surface font-bold text-right outline-none focus:border-primary"
                        />
                        <span className="text-xs text-on-surface-variant">sh</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Receipt saved in chat"
              className="w-full bg-surface-container border border-outline/30 rounded-md px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 mt-2 rounded-md bg-primary hover:bg-surface-variant text-on-primary hover:text-on-surface font-bold text-sm border border-outline/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Save Expense</span>
          </button>
        </form>
      </div>
    </div>
  );
};
