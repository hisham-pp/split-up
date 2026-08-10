'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { closeAddExpenseSheet } from '@/store/slices/uiSlice';
import { db, LocalExpense, LocalExpensePayer, LocalExpenseSplit, LocalGroup, LocalGroupMember } from '@/lib/db/db';
import { queueMutation, generateUuid } from '@/lib/sync/syncEngine';
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
  ChevronDown,
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
      const expenseId = generateUuid();

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
          id: generateUuid(),
          expenseId,
          memberId: selectedPayerId,
          amountCents,
        },
      ];

      const splitsData: LocalExpenseSplit[] = calculationResult.splits.map((s) => ({
        id: generateUuid(),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-t-[28px] sm:rounded-3xl overflow-hidden flex flex-col shadow-xl h-[90vh] sm:h-auto sm:max-h-[90vh]">
        
        {/* Drag Handle & Header */}
        <div className="w-full flex justify-center py-4 cursor-grab sm:hidden">
          <div className="w-8 h-1 bg-outline-variant rounded-full"></div>
        </div>
        <div className="px-6 pb-2 flex items-center justify-between z-10 bg-surface-container-lowest">
          <button
            onClick={() => dispatch(closeAddExpenseSheet())}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-[22px] font-medium text-on-surface">Add Expense</h2>
          <div className="w-10"></div>
        </div>

        {errorMsg && (
          <div className="mx-6 mb-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-28 flex flex-col">
          <form id="add-expense-form" onSubmit={handleSubmit} className="flex flex-col flex-1">
            
            {/* Amount Display */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-[57px] leading-[64px] font-normal text-on-surface flex items-baseline tracking-tight">
                <span className="text-3xl text-on-surface-variant mr-1">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-[180px] bg-transparent text-center border-none text-[57px] font-normal text-on-surface focus:outline-none focus:ring-0 p-0 m-0"
                />
              </div>
              <div className="mt-2 inline-flex items-center gap-1 bg-surface-container-high px-3 py-1 rounded-full cursor-pointer">
                <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-on-primary font-bold tracking-tight">IN</span>
                <span className="text-sm font-medium text-on-surface-variant ml-0.5">INR</span>
                <ChevronDown className="w-4 h-4 text-on-surface-variant" />
              </div>
            </div>

            {/* Input Fields */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="relative bg-surface-container-highest rounded-t-lg border-b border-on-surface-variant focus-within:border-primary focus-within:border-b-2 transition-all">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder=" "
                  className="peer w-full bg-transparent border-none px-4 pt-6 pb-2 text-base text-on-surface focus:outline-none focus:ring-0 placeholder-transparent"
                />
                <label className="absolute left-4 top-4 text-on-surface-variant transition-all peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-2 peer-[:not(:placeholder-shown)]:scale-75 origin-top-left pointer-events-none">
                  What was this for?
                </label>
              </div>
              
              <div className="flex gap-4">
                <div className="relative flex-1 bg-surface-container-highest rounded-t-lg border-b border-on-surface-variant flex items-center focus-within:border-primary focus-within:border-b-2 transition-all">
                  <Users className="absolute left-4 w-5 h-5 text-on-surface-variant z-10 pointer-events-none" />
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-base text-on-surface cursor-pointer focus:outline-none focus:ring-0 appearance-none"
                  >
                    {groups.length === 0 && <option value="">No Groups Found</option>}
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="h-[56px] w-[56px] bg-surface-container-highest rounded-lg flex items-center justify-center border-b border-on-surface-variant shrink-0 cursor-not-allowed"
                >
                  <Calendar className="w-6 h-6 text-on-surface-variant" />
                </button>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1 bg-surface-container-highest rounded-t-lg border-b border-on-surface-variant flex items-center focus-within:border-primary focus-within:border-b-2 transition-all">
                  <Tag className="absolute left-4 w-5 h-5 text-on-surface-variant z-10 pointer-events-none" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-transparent border-none pl-12 pr-10 py-4 text-base text-on-surface cursor-pointer focus:outline-none focus:ring-0 appearance-none"
                  >
                    <option value="Food">Food & Drinks</option>
                    <option value="Travel">Travel & Transport</option>
                    <option value="Housing">Accommodation</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 w-5 h-5 text-on-surface-variant z-10 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Split Options */}
            <div className="mb-8">
              <p className="text-sm font-medium text-on-surface-variant mb-2">Split type</p>
              <div className="flex bg-surface-container p-1 rounded-full">
                {(['Equal', 'Unequal', 'Percentage', 'Shares'] as SplitMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSplitMode(mode)}
                    className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                      splitMode === mode
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                  >
                    {mode === 'Percentage' ? '%' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Who Paid / Split among */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-4">
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-normal text-on-surface-variant">Paid by</span>
                  <div className="relative group">
                    <button type="button" className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-full hover:bg-surface-container transition-colors">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-on-primary text-[10px] uppercase font-bold">
                        {members.find(m => m.id === selectedPayerId)?.memberName?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm font-medium text-on-surface max-w-[100px] truncate">
                        {members.find(m => m.id === selectedPayerId)?.memberName || 'No one'}
                      </span>
                    </button>
                    {/* Hover Dropdown */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container-highest rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden border border-outline/10">
                      {members.map(m => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedPayerId(m.id)}
                          className="px-4 py-2 hover:bg-surface-variant cursor-pointer text-sm font-medium text-on-surface flex items-center gap-2"
                        >
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] uppercase font-bold shrink-0">
                            {m.memberName.charAt(0)}
                          </div>
                          <span className="truncate">{m.memberName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <hr className="border-outline-variant/30" />
              
              <div className="flex flex-col gap-2 relative group">
                <div className="flex justify-between items-center cursor-pointer">
                  <span className="text-sm font-normal text-on-surface-variant">Split among</span>
                  <button type="button" className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-full hover:bg-surface-container transition-colors">
                    <div className="flex -space-x-2">
                      <div className="w-5 h-5 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary text-[10px] font-bold border border-surface-container-low z-10">
                        {selectedSplitMemberIds.length > 0 ? members.find(m => m.id === selectedSplitMemberIds[0])?.memberName?.charAt(0) || '?' : '?'}
                      </div>
                      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-[10px] font-bold border border-surface-container-low">
                        {selectedSplitMemberIds.length}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-on-surface">
                      {selectedSplitMemberIds.length === members.length ? `All ${members.length} members` : `${selectedSplitMemberIds.length} members`}
                    </span>
                  </button>
                </div>

                <div className="space-y-2 mt-2">
                  {members.map((m) => {
                    const isSelected = selectedSplitMemberIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleSplitMember(m.id)}
                        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-surface border border-primary text-on-surface'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border ${
                              isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-medium">{m.memberName}</span>
                        </div>

                        {isSelected && splitMode === 'Unequal' && (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="₹0.00"
                            value={exactSplits[m.id] || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setExactSplits({
                                ...exactSplits,
                                [m.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 bg-surface-container-highest border-b border-on-surface-variant rounded-t px-2 py-1 text-sm text-on-surface font-medium text-right outline-none focus:border-primary focus:border-b-2"
                          />
                        )}

                        {isSelected && splitMode === 'Percentage' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={percentages[m.id] || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setPercentages({
                                  ...percentages,
                                  [m.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 bg-surface-container-highest border-b border-on-surface-variant rounded-t px-2 py-1 text-sm text-on-surface font-medium text-right outline-none focus:border-primary focus:border-b-2"
                            />
                            <span className="text-sm text-on-surface-variant">%</span>
                          </div>
                        )}

                        {isSelected && splitMode === 'Shares' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              placeholder="1"
                              value={shares[m.id] || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setShares({
                                  ...shares,
                                  [m.id]: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-16 bg-surface-container-highest border-b border-on-surface-variant rounded-t px-2 py-1 text-sm text-on-surface font-medium text-right outline-none focus:border-primary focus:border-b-2"
                            />
                            <span className="text-sm text-on-surface-variant">sh</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
          </form>
        </div>

        {/* Sticky Bottom CTA Area */}
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest to-transparent pt-12 z-20 pointer-events-none">
          <button
            type="submit"
            form="add-expense-form"
            disabled={isSubmitting}
            className="w-full h-[56px] bg-primary text-on-primary rounded-full text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm active:scale-[0.98] pointer-events-auto"
          >
            <Check className="w-5 h-5" />
            Save Expense
          </button>
        </div>

      </div>
    </div>
  );
};
