'use client';

import React, { useState, useRef } from 'react';
import { Expense, useDeleteExpenseMutation } from '@/store/api/expenseApi';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { formatCurrency, formatDateRelative } from '@/utils/formatters';
import { triggerHaptic } from '@/utils/haptics';
import {
  Utensils,
  Car,
  Home,
  Tv,
  ShoppingBag,
  Zap,
  Tag,
  Trash2,
  Edit3,
} from 'lucide-react';

interface SwipeableExpenseCardProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Food: Utensils,
  Travel: Car,
  Housing: Home,
  Entertainment: Tv,
  Shopping: ShoppingBag,
  Utilities: Zap,
  Other: Tag,
};

export const SwipeableExpenseCard: React.FC<SwipeableExpenseCardProps> = ({
  expense,
  onEdit,
}) => {
  const currency = useSelector((state: RootState) => state.ui.currency);
  const [deleteExpense] = useDeleteExpenseMutation();
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);

  const CategoryIcon = CATEGORY_ICONS[expense.category] || Tag;

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    // Only allow swiping left (negative deltaX)
    if (deltaX < 0 && deltaX > -140) {
      setTranslateX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (translateX < -70) {
      setTranslateX(-130); // Snap open actions
      triggerHaptic(20);
    } else {
      setTranslateX(0); // Snap shut
    }
  };

  const handleDelete = () => {
    triggerHaptic([30, 60]);
    deleteExpense(expense.id);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 my-2">
      {/* Background Actions (revealed on swipe left) */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2 bg-slate-950/90 z-0">
        <button
          onClick={() => {
            setTranslateX(0);
            onEdit?.(expense);
          }}
          className="w-12 h-12 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Edit"
        >
          <Edit3 className="w-5 h-5" />
        </button>
        <button
          onClick={handleDelete}
          className="w-12 h-12 rounded-xl bg-red-600/30 text-red-400 border border-red-500/40 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Foreground Content Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative z-10 flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800/60 active:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CategoryIcon className="w-5 h-5 stroke-[2]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-100 text-sm sm:text-base truncate">
              {expense.title}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Paid by{' '}
              <span className="text-slate-200 font-medium">
                {expense.paidBy.isCurrentUser ? 'You' : expense.paidBy.name}
              </span>{' '}
              · {formatDateRelative(expense.date)}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 ml-3">
          <p className="font-bold text-slate-100 text-base">
            {formatCurrency(expense.amount, currency)}
          </p>
          <p className="text-[11px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
            {expense.splitMode}
          </p>
        </div>
      </div>
    </div>
  );
};
