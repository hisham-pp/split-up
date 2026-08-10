'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { db, LocalGroup, LocalGroupMember } from '@/lib/db/db';
import { queueMutation } from '@/lib/sync/syncEngine';
import { setActiveGroup } from '@/store/slices/uiSlice';
import { ArrowLeft, CheckCircle, Sparkles, AlertCircle } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';

export default function JoinGroupPage({ params }: { params: { inviteCode: string } }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [group, setGroup] = useState<LocalGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const inviteCode = params.inviteCode;

  useEffect(() => {
    async function fetchGroup() {
      try {
        const match = inviteCode.match(/SPLITUP_(.*)_INVITE/i);
        if (!match) {
          setError('Invalid invite code format.');
          setLoading(false);
          return;
        }

        const groupId = match[1].toLowerCase();
        const foundGroup = await db.groups.get(groupId);

        if (foundGroup) {
          setGroup(foundGroup);
        } else {
          setError('Group not found. Since this is an offline-first demo, make sure you open this link in the same browser where the group was created.');
        }
      } catch (err) {
        setError('An error occurred while fetching the group.');
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Force them to open Auth Modal by doing some action or just wait?
      // Actually we just show the auth modal if not authenticated
      return;
    }

    if (!group) return;

    setJoining(true);
    try {
      // Check if already a member
      const existingMember = await db.groupMembers.where({ groupId: group.id, userId: user?.id }).first();
      
      if (!existingMember) {
        const now = new Date().toISOString();
        const newMember: LocalGroupMember = {
          id: `mb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          groupId: group.id,
          userId: user?.id,
          memberName: user?.fullName || 'New Member',
          memberAvatar: user?.avatarUrl,
          role: 'member',
          joinedAt: now,
        };
        await db.groupMembers.put(newMember);
        await queueMutation('ADD_MEMBER', newMember);
      }

      dispatch(setActiveGroup(group as any));
      router.push('/');
    } catch (err) {
      setError('Failed to join the group.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col antialiased">
      <AuthModal />
      
      <header className="px-4 py-4 safe-pt flex items-center">
        <button
          onClick={() => router.push('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {error ? (
          <div className="text-center bg-error-container/20 border border-error-container p-6 rounded-3xl w-full">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h1 className="text-xl font-bold text-on-surface mb-2">Oops!</h1>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 rounded-full bg-surface-container-highest text-on-surface font-semibold text-sm transition-all hover:bg-surface-variant w-full"
            >
              Back to Home
            </button>
          </div>
        ) : group ? (
          <div className="w-full bg-surface-container-low rounded-[32px] overflow-hidden shadow-sm border border-outline-variant/20 animate-fade-in text-center">
            <div className="h-40 w-full relative">
              <img
                src={group.coverImage || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'}
                alt={group.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-lg border-4 border-surface-container-low">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="px-6 pt-10 pb-8">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">
                You've been invited
              </span>
              <h1 className="text-[28px] font-medium text-on-surface leading-tight mb-2">
                Join {group.name}
              </h1>
              <p className="text-sm text-on-surface-variant font-medium mb-8">
                Category: {group.category}
              </p>

              {!isAuthenticated ? (
                <div className="bg-surface-container p-4 rounded-2xl mb-6">
                  <p className="text-sm font-medium text-on-surface mb-3">
                    You need to log in or create an account to join this group.
                  </p>
                  <button
                    onClick={() => {
                      // Clicking the button will do nothing directly if AuthModal handles it via global state,
                      // wait, AuthModal is shown automatically if `!isAuthenticated` because it listens to the state?
                      // Let's check how AuthModal is triggered. Usually it stays open if not authenticated.
                      // If AuthModal is dismissible, we should redirect them to '/' or trigger login.
                      window.dispatchEvent(new CustomEvent('OPEN_AUTH_MODAL'));
                    }}
                    className="w-full h-12 rounded-full bg-primary text-on-primary font-medium text-sm transition-all hover:bg-primary/90 shadow-sm"
                  >
                    Login to Join
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full h-14 rounded-full bg-primary text-on-primary font-medium text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                >
                  {joining ? (
                    <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Join Group</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
