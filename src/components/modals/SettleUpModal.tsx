'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { db, LocalGroup, LocalGroupMember, LocalSettlement } from '@/lib/db/db';
import { queueMutation, generateUuid } from '@/lib/sync/syncEngine';
import { formatCurrency } from '@/utils/formatters';
import { toMinorUnits, toMajorUnits } from '@/lib/financial/financialEngine';
import { SimplifiedTransaction } from '@/lib/financial/debtSimplifier';
import { CheckCircle, ArrowRight, DollarSign } from 'lucide-react';

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
        id: generateUuid(),
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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6">
        <div className="mb-5">
          <h2 className="text-[22px] font-medium text-on-surface flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-tertiary" />
            <span>Settle Up Debts</span>
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Optimized minimal payments for <span className="text-primary font-semibold">{group.name}</span>
          </p>
        </div>

        {simplifiedTransactions.length === 0 ? (
          <div className="p-6 text-center bg-surface-container rounded-2xl border border-outline/10 my-4">
            <CheckCircle className="w-10 h-10 text-tertiary mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-on-surface">Everyone is fully settled up!</p>
            <p className="text-xs text-on-surface-variant mt-1">No outstanding balances remaining in this group.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
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
                    onClick={() => { setSelectedTx(tx); setCustomAmount(''); }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary-container/30 border-primary text-on-surface'
                        : 'bg-surface-container border-outline/10 hover:border-outline/30 text-on-surface-variant'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{fromName}</span>
                      <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                      <span className="font-semibold text-sm">{toName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-tertiary text-base">
                        {formatCurrency(toMajorUnits(tx.amountCents), currency)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRecordSettlement(tx); }}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary text-xs font-semibold active:scale-95 transition-all"
                      >
                        Record Paid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTx && (
              <div className="pt-4 border-t border-outline/10 space-y-3">
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Custom Amount (Optional)
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Default: ${toMajorUnits(selectedTx.amountCents)}`}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-surface-container-highest border-b border-on-surface-variant rounded-t-lg pl-10 pr-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:border-b-2"
                  />
                </div>

                <div className="relative bg-surface-container-highest border-b border-on-surface-variant rounded-t-lg focus-within:border-primary focus-within:border-b-2">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid via UPI / Cash"
                    className="w-full bg-transparent px-4 py-3 text-sm text-on-surface focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleRecordSettlement()}
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-on-primary text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
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
    </Modal>
  );
};
