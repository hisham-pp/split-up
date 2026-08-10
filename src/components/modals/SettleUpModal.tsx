'use client';

import React, { useState } from 'react';
import { db, LocalGroup, LocalGroupMember, LocalSettlement } from '@/lib/db/db';
import { queueMutation } from '@/lib/sync/syncEngine';
import { formatCurrency } from '@/utils/formatters';
import { toMinorUnits, toMajorUnits } from '@/lib/financial/financialEngine';
import { SimplifiedTransaction } from '@/lib/financial/debtSimplifier';
import { X, CheckCircle, ArrowRight, DollarSign } from 'lucide-react';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: LocalGroup;
  members: LocalGroupMember[];
  simplifiedTransactions: SimplifiedTransaction[];
  onSettled: () => void;
  currency: string;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  simplifiedTransactions,
  onSettled,
  currency,
}) => {
  const [selectedTx, setSelectedTx] = useState<SimplifiedTransaction | null>(
    simplifiedTransactions.length > 0 ? simplifiedTransactions[0] : null
  );
  const [customAmount, setCustomAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('Settlement payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const getMemberName = (id: string) => {
    const m = members.find((mem) => mem.id === id);
    return m ? m.memberName : 'Member';
  };

  const handleRecordSettlement = async (tx?: SimplifiedTransaction) => {
    const targetTx = tx || selectedTx;
    if (!targetTx) return;

    setIsSubmitting(true);

    try {
      const amountCents = customAmount ? toMinorUnits(parseFloat(customAmount)) : targetTx.amountCents;
      const now = new Date().toISOString();

      const newSettlement: LocalSettlement = {
        id: `stl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        groupId: group.id,
        payerMemberId: targetTx.fromMemberId,
        payeeMemberId: targetTx.toMemberId,
        amountCents,
        date: now,
        notes: notes || 'Settlement payment',
        createdAt: now,
        updatedAt: now,
      };

      await db.settlements.put(newSettlement);
      await queueMutation('CREATE_SETTLEMENT', newSettlement);

      onSettled();
      onClose();
    } catch (err) {
      console.error('Error creating settlement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>Settle Up Debts</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Optimized minimal payments for <span className="text-indigo-400 font-semibold">{group.name}</span>
          </p>
        </div>

        {simplifiedTransactions.length === 0 ? (
          <div className="p-6 text-center bg-slate-950 rounded-2xl border border-slate-800 my-4">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-200">Everyone is fully settled up!</p>
            <p className="text-xs text-slate-400 mt-1">No outstanding balances remaining in this group.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Recommended Transactions
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {simplifiedTransactions.map((tx, idx) => {
                const fromName = getMemberName(tx.fromMemberId);
                const toName = getMemberName(tx.toMemberId);
                const isSelected = selectedTx?.fromMemberId === tx.fromMemberId && selectedTx?.toMemberId === tx.toMemberId;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedTx(tx);
                      setCustomAmount('');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-slate-100'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{fromName}</span>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-sm">{toName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-400 text-base">
                        {formatCurrency(toMajorUnits(tx.amountCents), currency)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecordSettlement(tx);
                        }}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                      >
                        Record Paid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTx && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  Custom Settlement Amount (Optional)
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Default: ${toMajorUnits(selectedTx.amountCents)}`}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Notes / Payment Method
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid via UPI / Cash"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => handleRecordSettlement()}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Mark {getMemberName(selectedTx.fromMemberId)} Paid{' '}
                    {getMemberName(selectedTx.toMemberId)}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
