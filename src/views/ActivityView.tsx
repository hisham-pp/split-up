'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { db, LocalExpense, LocalSettlement, LocalGroup } from '@/lib/db/db';
import { toMajorUnits } from '@/lib/financial/financialEngine';
import { formatCurrency } from '@/utils/formatters';
import { Activity, CreditCard, CheckCircle2, Trash2 } from 'lucide-react';

interface ActivityFeedItem {
  id: string;
  type: 'expense_added' | 'settlement' | 'expense_deleted';
  title: string;
  description: string;
  amountCents?: number;
  date: string;
  groupName: string;
}

export const ActivityView: React.FC = () => {
  const currency = useSelector((state: RootState) => state.ui.currency);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);

  const loadActivities = async () => {
    const expenses = await db.expenses.toArray();
    const settlements = await db.settlements.toArray();
    const groups = await db.groups.toArray();

    const groupMap = new Map(groups.map((g) => [g.id, g.name]));

    const items: ActivityFeedItem[] = [];

    expenses.forEach((e) => {
      if (e.deletedAt) {
        items.push({
          id: `act_del_${e.id}`,
          type: 'expense_deleted',
          title: `Expense Removed`,
          description: `Deleted "${e.title}"`,
          date: e.deletedAt,
          groupName: groupMap.get(e.groupId) || 'Group',
        });
      } else {
        items.push({
          id: `act_exp_${e.id}`,
          type: 'expense_added',
          title: `Expense Added`,
          description: `Added "${e.title}"`,
          amountCents: e.amountCents,
          date: e.createdAt || e.date,
          groupName: groupMap.get(e.groupId) || 'Group',
        });
      }
    });

    settlements.forEach((s) => {
      items.push({
        id: `act_stl_${s.id}`,
        type: 'settlement',
        title: `Balance Settled`,
        description: s.notes || 'Settlement payment recorded',
        amountCents: s.amountCents,
        date: s.date,
        groupName: groupMap.get(s.groupId) || 'Group',
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivities(items);
  };

  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Recent Activity</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Audit log of all expenses and settlements</p>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center">
          <Activity className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
          <p className="text-sm font-medium text-on-surface-variant">No activity recorded yet</p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-2xl flex flex-col overflow-hidden p-2 gap-2">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    act.type === 'expense_added'
                      ? 'bg-primary-container text-on-primary-container'
                      : act.type === 'settlement'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {act.type === 'expense_added' && <CreditCard className="w-6 h-6" />}
                  {act.type === 'settlement' && <CheckCircle2 className="w-6 h-6" />}
                  {act.type === 'expense_deleted' && <Trash2 className="w-6 h-6" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-on-surface">{act.title}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                      {act.groupName}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-0.5">{act.description}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-medium opacity-80">
                    {new Date(act.date).toLocaleString()}
                  </p>
                </div>
              </div>

              {act.amountCents && (
                <div className="text-right font-bold text-sm text-on-surface">
                  {formatCurrency(toMajorUnits(act.amountCents), currency)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
