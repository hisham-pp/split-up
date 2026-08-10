'use client';

import React, { useState, useEffect } from 'react';
import { db, LocalGroup, LocalGroupMember } from '@/lib/db/db';
import { queueMutation } from '@/lib/sync/syncEngine';
import { X, Plus, Trash2, Users, Image as ImageIcon, Sparkles, ChevronDown } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant/20 rounded-[28px] p-6 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-highest rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 mt-2">
          <h2 className="text-[22px] font-medium text-on-surface flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span>{groupToEdit ? 'Edit Group' : 'Create New Group'}</span>
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 pr-6">
            Setup a group to share expenses with friends, family, or housemates
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative bg-surface-container-highest rounded-t-lg border-b border-on-surface-variant focus-within:border-primary focus-within:border-b-2 transition-all">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=" "
              className="peer w-full bg-transparent border-none px-4 pt-6 pb-2 text-base text-on-surface focus:outline-none focus:ring-0 placeholder-transparent"
            />
            <label className="absolute left-4 top-4 text-on-surface-variant transition-all peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-primary peer-[:not(:placeholder-shown)]:-translate-y-2 peer-[:not(:placeholder-shown)]:scale-75 origin-top-left pointer-events-none font-medium">
              Group Name *
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Category
              </label>
              <div className="relative flex items-center bg-surface-container-highest rounded-md border-b border-on-surface-variant focus-within:border-primary focus-within:border-b-2 transition-all">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-transparent border-none pl-3 pr-10 py-3 text-sm text-on-surface cursor-pointer focus:outline-none focus:ring-0 appearance-none"
                >
                  <option value="Travel">Travel</option>
                  <option value="Housing">Housing</option>
                  <option value="Food">Food & Dining</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Cover Image URL
              </label>
              <div className="relative flex items-center bg-surface-container-highest rounded-md border-b border-on-surface-variant focus-within:border-primary focus-within:border-b-2 transition-all">
                <ImageIcon className="absolute left-3 w-4 h-4 text-on-surface-variant" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-transparent border-none pl-9 pr-3 py-3 text-sm text-on-surface focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              Preset Banners
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {[
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=600&q=80'
              ].map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Preset ${idx + 1}`}
                  onClick={() => setCoverImage(url)}
                  className={`w-16 h-12 rounded-lg object-cover cursor-pointer border-2 transition-all shrink-0 ${
                    coverImage === url ? 'border-primary scale-105 shadow-md' : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {!groupToEdit && (
            <div className="pt-2">
              <label className="block text-sm font-medium text-on-surface mb-2">
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
                  className="flex-1 bg-surface-container-highest border-none rounded-full px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleAddMemberInput}
                  className="px-5 py-3 bg-primary-container text-on-primary-container hover:bg-primary-container/80 rounded-full text-sm font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 rounded-full bg-surface-variant text-on-surface-variant text-xs font-medium flex items-center gap-1.5 border border-outline/20">
                  <Users className="w-3.5 h-3.5" />
                  <span>You (Owner)</span>
                </div>
                {memberInputs.map((mName, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-surface text-on-surface text-xs font-medium flex items-center gap-2 border border-outline/30"
                  >
                    <span>{mName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberInput(idx)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-full bg-primary text-on-primary font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm flex items-center justify-center"
            >
              {groupToEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
