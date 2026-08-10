'use client';

import React, { useState, useEffect } from 'react';
import { db, LocalGroup, LocalGroupMember } from '@/lib/db/db';
import { queueMutation } from '@/lib/sync/syncEngine';
import { X, Plus, Trash2, Users, Image as ImageIcon, Sparkles } from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: LocalGroup | null;
  onGroupSaved: () => void;
  currentUserId: string;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
  onGroupSaved,
  currentUserId,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Travel');
  const [coverImage, setCoverImage] = useState('');
  const [memberInputs, setMemberInputs] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setCategory(groupToEdit.category);
      setCoverImage(groupToEdit.coverImage || '');
    } else {
      setName('');
      setCategory('Travel');
      setCoverImage('https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80');
      setMemberInputs(['Alex', 'John', 'Sarah']);
    }
  }, [groupToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddMemberInput = () => {
    if (!newMemberName.trim()) return;
    setMemberInputs([...memberInputs, newMemberName.trim()]);
    setNewMemberName('');
  };

  const handleRemoveMemberInput = (index: number) => {
    setMemberInputs(memberInputs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const now = new Date().toISOString();

    try {
      if (groupToEdit) {
        const updatedGroup: LocalGroup = {
          ...groupToEdit,
          name: name.trim(),
          category,
          coverImage: coverImage.trim() || undefined,
          updatedAt: now,
        };
        await db.groups.put(updatedGroup);
        await queueMutation('UPDATE_GROUP', updatedGroup);
      } else {
        const newGroup: LocalGroup = {
          id: `grp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: name.trim(),
          category,
          coverImage: coverImage.trim() || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
          createdBy: currentUserId,
          createdAt: now,
          updatedAt: now,
        };

        await db.groups.put(newGroup);
        await queueMutation('CREATE_GROUP', newGroup);

        // Add Current User as Owner
        const ownerMember: LocalGroupMember = {
          id: `mb_${Date.now()}_owner`,
          groupId: newGroup.id,
          userId: currentUserId,
          memberName: 'You',
          role: 'owner',
          joinedAt: now,
        };
        await db.groupMembers.put(ownerMember);
        await queueMutation('ADD_MEMBER', ownerMember);

        // Add requested members
        for (const mName of memberInputs) {
          const guestMember: LocalGroupMember = {
            id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            groupId: newGroup.id,
            memberName: mName,
            role: 'member',
            joinedAt: now,
          };
          await db.groupMembers.put(guestMember);
          await queueMutation('ADD_MEMBER', guestMember);
        }
      }

      onGroupSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>{groupToEdit ? 'Edit Group' : 'Create New Group'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Setup a group to share expenses with friends, family, or housemates
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip 2026"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Travel font-sans">Travel</option>
                <option value="Housing">Housing</option>
                <option value="Food">Food & Dining</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cover Image URL
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {!groupToEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Add Group Members
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemberInput();
                    }
                  }}
                  placeholder="Enter member name (e.g. Sarah)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddMemberInput}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>You (Owner)</span>
                </div>
                {memberInputs.map((mName, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2"
                  >
                    <span>{mName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberInput(idx)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            {groupToEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};
