'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { closeAddExpenseSheet, incrementPendingSync } from '@/store/slices/uiSlice';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  useAddExpenseMutation,
  useGetGroupsQuery,
  SAMPLE_MEMBERS,
  CURRENT_USER,
} from '@/store/api/expenseApi';
import { triggerHaptic } from '@/utils/haptics';
import {
  Utensils,
  Car,
  Home,
  Tv,
  ShoppingBag,
  Zap,
  Tag,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Food', label: 'Food & Drink', icon: Utensils },
  { id: 'Travel', label: 'Travel', icon: Car },
  { id: 'Housing', label: 'Housing', icon: Home },
  { id: 'Entertainment', label: 'Entertainment', icon: Tv },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'Utilities', label: 'Utilities', icon: Zap },
  { id: 'Other', label: 'Other', icon: Tag },
];

export const AddExpenseSheet: React.FC = () => {
  const dispatch = useDispatch();
  const { addExpenseSheetOpen, preselectedGroupId, currency, isOffline } = useSelector(
    (state: RootState) => state.ui
  );
  const { data: groups = [] } = useGetGroupsQuery();
  const [addExpense] = useAddExpenseMutation();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [paidById, setPaidById] = useState(CURRENT_USER.id);
  const [splitMode, setSplitMode] = useState<'Equal' | 'Unequal' | 'Percentage' | 'Shares'>('Equal');
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    SAMPLE_MEMBERS.map((m) => m.id)
  );

  useEffect(() => {
    if (preselectedGroupId) {
      setSelectedGroupId(preselectedGroupId);
    } else if (groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [preselectedGroupId, groups]);

  const handleClose = () => {
    dispatch(closeAddExpenseSheet());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;

    triggerHaptic([30, 70, 30]);

    const paidByMember = SAMPLE_MEMBERS.find((m) => m.id === paidById) || CURRENT_USER;
    const splitMembers = SAMPLE_MEMBERS.filter((m) => selectedMemberIds.includes(m.id));

    await addExpense({
      title,
      amount: Number(amount),
      groupId: selectedGroupId || groups[0]?.id,
      paidBy: paidByMember,
      splitMode,
      category: selectedCategory as any,
      splitBetween: splitMembers,
    });

    if (isOffline) {
      dispatch(incrementPendingSync());
    }

    // Reset form
    setTitle('');
    setAmount('');
    handleClose();
  };

  const toggleMemberSelect = (id: string) => {
    triggerHaptic(10);
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length > 1) {
        setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
      }
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  return (
    <BottomSheet
      isOpen={addExpenseSheetOpen}
      onClose={handleClose}
      title="Add Expense"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title / "What was it for?" */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            What was it for?
          </label>
          <input
            type="text"
            placeholder="e.g. Dinner at Britto's, Uber"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Amount
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-2xl font-bold text-indigo-400 select-none">
              {currency}
            </span>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 text-2xl font-bold text-white bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Group Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Group
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Paid By Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Paid by
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SAMPLE_MEMBERS.map((m) => {
              const isSelected = paidById === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    triggerHaptic(10);
                    setPaidById(m.id);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/40'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span>{m.isCurrentUser ? 'You' : m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Between Multi-select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Split between
            </label>
            <span className="text-xs text-indigo-400 font-medium">
              {selectedMemberIds.length} people
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_MEMBERS.map((m) => {
              const isChecked = selectedMemberIds.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleMemberSelect(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isChecked
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                  <span>{m.isCurrentUser ? 'You' : m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Split Mode
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['Equal', 'Unequal', 'Percentage', 'Shares'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => {
                  triggerHaptic(10);
                  setSplitMode(mode);
                }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  splitMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => {
                    triggerHaptic(10);
                    setSelectedCategory(cat.id);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 active:scale-98 transition-all mt-4"
        >
          Add Expense
        </button>
      </form>
    </BottomSheet>
  );
};
