'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { closeAuthModal, setUser, setAuthError } from '@/store/slices/authSlice';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabase';
import { db } from '@/lib/db/db';
import { X, Mail, Lock, User, LogIn, UserPlus, Sparkles, Check } from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=6366f1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=10b981',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya&backgroundColor=f59e0b',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=ec4899',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria&backgroundColor=8b5cf6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=3b82f6',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky&backgroundColor=06b6d4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=f97316',
];

export const AuthModal: React.FC = () => {
  const dispatch = useDispatch();
  const { authModalOpen, authMode, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    dispatch(setAuthError(null));

    const now = new Date().toISOString();

    try {
      if (isSupabaseConfigured && supabase) {
        if (authMode === 'signup') {
          const { data, error: sbError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, avatar_url: selectedAvatar },
            },
          });
          
          const userId = data?.user?.id || `usr_${Date.now()}`;
          const newUser = {
            id: userId,
            email: email,
            fullName: fullName || email.split('@')[0],
            avatarUrl: selectedAvatar,
          };

          // Save directly to Supabase PostgreSQL table named "users" (no email verification required!)
          await supabase.from('users').upsert({
            id: userId,
            email: email,
            full_name: newUser.fullName,
            avatar_url: selectedAvatar,
            created_at: now,
            updated_at: now,
          });

          // Save locally to Dexie
          await db.profiles.put({
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            avatarUrl: selectedAvatar,
            updatedAt: now,
          });

          dispatch(setUser(newUser));
          dispatch(closeAuthModal());
        } else {
          // Login Mode
          const { data, error: sbError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          const userId = data?.user?.id || `usr_${Date.now()}`;
          const user = {
            id: userId,
            email: data?.user?.email || email,
            fullName: data?.user?.user_metadata?.full_name || fullName || email.split('@')[0],
            avatarUrl: data?.user?.user_metadata?.avatar_url || selectedAvatar,
          };

          // Upsert to Supabase "users" table
          await supabase.from('users').upsert({
            id: userId,
            email: user.email,
            full_name: user.fullName,
            avatar_url: user.avatarUrl,
            updated_at: now,
          });

          await db.profiles.put({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            updatedAt: now,
          });

          dispatch(setUser(user));
          dispatch(closeAuthModal());
        }
      } else {
        // Offline / Local database mode
        const localUserId = `usr_${Date.now()}`;
        const localUser = {
          id: localUserId,
          email,
          fullName: fullName || email.split('@')[0],
          avatarUrl: selectedAvatar,
        };

        await db.profiles.put({
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.fullName,
          avatarUrl: selectedAvatar,
          updatedAt: now,
        });

        dispatch(setUser(localUser));
        dispatch(closeAuthModal());
      }
    } catch (err: any) {
      dispatch(setAuthError(err.message || 'Authentication failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={authModalOpen} onClose={() => dispatch(closeAuthModal())} fullHeight>
      <div className="p-6">

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-surface-variant text-on-surface border border-outline/30 rounded-md flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface">
            {authMode === 'signup' ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 font-medium">
            {authMode === 'signup'
              ? 'Join Split Up to track and share expenses effortlessly'
              : 'Sign in to access your groups and balances'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-error/10 border border-error/30 text-error text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">
                  Choose Profile Avatar
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                  {PRESET_AVATARS.map((avatar, idx) => {
                    const isSelected = selectedAvatar === avatar;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative rounded-md overflow-hidden border transition-all active:scale-95 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 scale-105'
                            : 'border-outline hover:border-outline/50 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={avatar} alt={`Avatar ${idx + 1}`} className="w-10 h-10 object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    suppressHydrationWarning
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full bg-surface-container border border-outline/30 rounded-md pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-on-surface-variant" />
              <input
                type="email"
                suppressHydrationWarning
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-container border border-outline/30 rounded-md pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-on-surface-variant" />
              <input
                type="password"
                suppressHydrationWarning
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container border border-outline/30 rounded-md pl-10 pr-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-md bg-primary hover:bg-surface-variant text-on-primary hover:text-on-surface active:scale-95 border border-outline/30 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {authMode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() =>
              dispatch(
                authMode === 'signup'
                  ? { type: 'auth/openAuthModal', payload: 'login' }
                  : { type: 'auth/openAuthModal', payload: 'signup' }
              )
            }
            className="text-xs font-bold text-on-surface-variant hover:text-on-surface hover:underline transition-colors"
          >
            {authMode === 'signup'
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
