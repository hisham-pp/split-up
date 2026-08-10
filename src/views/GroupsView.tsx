'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setActiveGroup } from '@/store/slices/uiSlice';
import { useGetGroupsQuery, Group } from '@/store/api/expenseApi';
import { formatCurrency } from '@/utils/formatters';
import { triggerHaptic } from '@/utils/haptics';
import { Users, Plus, Search, ChevronRight, Sparkles } from 'lucide-react';

export const GroupsView: React.FC = () => {
  const dispatch = useDispatch();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const { data: groups = [] } = useGetGroupsQuery();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGroupClick = (group: Group) => {
    triggerHaptic(12);
    dispatch(setActiveGroup(group));
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Top Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Groups Grid / List */}
      <div className="space-y-3">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            onClick={() => handleGroupClick(group)}
            className="group relative overflow-hidden flex items-center justify-between p-4 rounded-3xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0">
              <img
                src={group.coverImage}
                alt={group.name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-800 group-hover:scale-105 transition-transform"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100 text-base truncate">
                    {group.name}
                  </h3>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {group.category}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{group.members.length} members</span>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 ml-3">
              <p
                className={`font-bold text-sm sm:text-base ${
                  group.userNetBalance > 0
                    ? 'text-emerald-400'
                    : group.userNetBalance < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {group.userNetBalance > 0
                  ? `+${formatCurrency(group.userNetBalance, currency)}`
                  : group.userNetBalance < 0
                  ? `-${formatCurrency(Math.abs(group.userNetBalance), currency)}`
                  : 'Settled'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {group.userNetBalance > 0
                  ? 'You get back'
                  : group.userNetBalance < 0
                  ? 'You owe'
                  : 'All good'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
