'use client';

import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { db } from '@/lib/db/db';
import { queueMutation } from '@/lib/sync/syncEngine';
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

export interface UIExpenseItem {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  amount: number;
  paidBy: { id: string; name: string; avatar?: string; email?: string; isCurrentUser?: boolean };
  date: string;
  category: 'Food' | 'Travel' | 'Housing' | 'Entertainment' | 'Shopping' | 'Utilities' | 'Other';
  splitMode: 'Equal' | 'Unequal' | 'Percentage' | 'Shares';
  splitBetween: any[];
  notes?: string;
}

interface SwipeableExpenseCardProps {
  expense: UIExpenseItem;
  onEdit?: (expense: UIExpenseItem) => void;
  onDeleted?: () => void;
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
  onDeleted,
}) => {
  const currency = useSelector((state: RootState) => state.ui.currency);
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
    if (deltaX < 0 && deltaX > -140) {
      setTranslateX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (translateX < -70) {
      setTranslateX(-130);
      triggerHaptic(20);
    } else {
      setTranslateX(0);
    }
  };

  const handleDelete = async () => {
    triggerHaptic([30, 60]);
    const now = new Date().toISOString();
    await db.expenses.update(expense.id, { deletedAt: now });
    await queueMutation('DELETE_EXPENSE', { id: expense.id });
    onDeleted?.();
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
          className="w-11 h-11 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="w-11 h-11 rounded-xl bg-rose-600/30 text-rose-400 border border-rose-500/40 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Delete"
        >
          <Trash2 className="w-4 h-4" />
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
              <span className="text-indigo-300 font-medium">{expense.groupName}</span> · {formatDateRelative(expense.date)}
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
