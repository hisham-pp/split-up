'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter } from 'next/navigation';
import { setActiveGroup } from '@/store/slices/uiSlice';
import { db, LocalGroup } from '@/lib/db/db';
import { computeGroupBalances, toMajorUnits } from '@/lib/financial/financialEngine';
import { formatCurrency } from '@/utils/formatters';
import { GroupModal } from '@/components/modals/GroupModal';
import { triggerHaptic } from '@/utils/haptics';
import { Plus, Search, Users, ChevronRight, Layers } from 'lucide-react';

export const GroupsView: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const currency = useSelector((state: RootState) => state.ui.currency);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [groupBalancesMap, setGroupBalancesMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadGroups = async () => {
    const activeGroups = await db.groups.filter((g) => !g.deletedAt).toArray();
    setGroups(activeGroups);

    const gBalMap: Record<string, number> = {};

    for (const g of activeGroups) {
      const gMembers = await db.groupMembers.where('groupId').equals(g.id).toArray();
      const memberIds = gMembers.map((m) => m.id);

      const gExp = await db.expenses
        .where('groupId')
        .equals(g.id)
        .filter((e) => e.deletedAt === null || e.deletedAt === undefined)
        .toArray();
      const expList = [];

      for (const e of gExp) {
        const payers = await db.expensePayers.where('expenseId').equals(e.id).toArray();
        const splits = await db.expenseSplits.where('expenseId').equals(e.id).toArray();
        expList.push({ payers, splits });
      }

      const gStl = await db.settlements
        .where('groupId')
        .equals(g.id)
        .filter((s) => s.deletedAt === null || s.deletedAt === undefined)
        .toArray();
      const computed = computeGroupBalances(memberIds, expList, gStl);

      const myMember = gMembers.find(
        (m) => m.userId === currentUser?.id || m.memberName.toLowerCase() === currentUser?.fullName.toLowerCase()
      );
      gBalMap[g.id] = myMember ? computed[myMember.id]?.netBalance || 0 : 0;
    }

    setGroupBalancesMap(gBalMap);
  };

  useEffect(() => {
    loadGroups();
    const interval = setInterval(loadGroups, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const categories = ['All', 'Travel', 'Housing', 'Food', 'Entertainment', 'Utilities', 'Other'];

  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Header & Create Group CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Groups</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Manage your shared expenses and trip groups</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(10);
            setIsGroupModalOpen(true);
          }}
          className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container font-medium text-sm transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shadow-primary-container/20"
        >
          <Plus className="w-5 h-5" />
          <span>New Group</span>
        </button>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-on-surface-variant" />
          {mounted ? (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups by name..."
              className="w-full bg-surface-container border border-outline/30 rounded-md pl-10 pr-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          ) : (
            <div className="w-full h-9 bg-surface-container border border-outline/30 rounded-md" />
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-transparent border border-outline/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="p-8 text-center bg-surface-container rounded-md border border-outline/20">
          <Layers className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
          <p className="text-sm font-medium text-on-surface-variant">No groups found</p>
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="mt-3 text-xs font-bold px-4 py-2 rounded-md bg-primary text-on-primary hover:bg-surface-variant hover:text-on-surface border border-outline/30"
          >
            + Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredGroups.map((group) => {
            const netBal = groupBalancesMap[group.id] || 0;
            return (
              <div
                key={group.id}
                onClick={() => {
                  triggerHaptic(10);
                  router.push(`/groups/${group.id}`);
                }}
                className="group relative overflow-hidden rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer active:scale-95 p-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      group.coverImage ||
                      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={group.name}
                    className="w-14 h-14 rounded-2xl object-cover shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">
                      {group.category}
                    </span>
                    <h3 className="text-base font-semibold text-on-surface truncate">
                      {group.name}
                    </h3>
                    <p
                      className={`text-xs font-medium mt-1 ${
                        netBal > 0
                          ? 'text-positive'
                          : netBal < 0
                          ? 'text-negative'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {netBal > 0
                        ? `You are owed ${formatCurrency(toMajorUnits(netBal), currency)}`
                        : netBal < 0
                        ? `You owe ${formatCurrency(toMajorUnits(Math.abs(netBal)), currency)}`
                        : 'Settled'}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupSaved={() => loadGroups()}
        currentUserId={currentUser?.id || 'usr_hisham'}
      />
    </div>
  );
};
