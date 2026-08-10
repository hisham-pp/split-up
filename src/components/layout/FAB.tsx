'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { openAddExpenseSheet } from '@/store/slices/uiSlice';
import { Plus } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

export const FAB: React.FC = () => {
  const dispatch = useDispatch();
  const activeGroup = useSelector((state: RootState) => state.ui.activeGroup);

  const handleClick = () => {
    triggerHaptic([20, 40]);
    dispatch(openAddExpenseSheet(activeGroup?.id));
  };

  return (
    <div className="fixed bottom-[72px] right-4 z-40 lg:bottom-8 lg:right-8 safe-nav-bottom transition-all duration-200">
      <button
        onClick={handleClick}
        className="group relative flex items-center justify-center gap-2 h-14 px-4 sm:px-5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-xl shadow-indigo-600/30 border border-indigo-400/30 active:scale-90 transition-all duration-200"
        aria-label="Add Expense"
      >
        <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Plus className="w-6 h-6 stroke-[2.5] transition-transform group-hover:rotate-90 duration-300" />
        <span className="hidden sm:inline-block text-sm tracking-wide">
          Expense
        </span>
      </button>
    </div>
  );
};
