'use client';

import React from 'react';
import { useGetActivityQuery } from '@/store/api/expenseApi';
import { Activity, Plus, CheckCircle, Trash2, ArrowRight } from 'lucide-react';

export const ActivityView: React.FC = () => {
  const { data: activities = [] } = useGetActivityQuery();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'expense_added':
        return <Plus className="w-4 h-4 text-indigo-400" />;
      case 'settlement':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'expense_deleted':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <h2 className="text-lg font-bold text-white">Recent Activity</h2>

      <div className="space-y-3">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800"
          >
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
              {getActivityIcon(item.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-200 text-sm truncate">
                  {item.title}
                </h3>
                <span className="text-xs text-slate-500 shrink-0">
                  {item.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
