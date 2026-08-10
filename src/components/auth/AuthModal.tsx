'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { closeAuthModal, setUser, setAuthError } from '@/store/slices/authSlice';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabase';
import { db } from '@/lib/db/db';
import { X, Mail, Lock, User, LogIn, UserPlus, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const dispatch = useDispatch();
  const { authModalOpen, authMode, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    dispatch(setAuthError(null));

    try {
      if (isSupabaseConfigured && supabase) {
        if (authMode === 'signup') {
          const { data, error: sbError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });
          if (sbError) throw sbError;
          if (data.user) {
            const newUser = {
              id: data.user.id,
              email: data.user.email || email,
              fullName: fullName || email.split('@')[0],
            };
            await db.profiles.put({
              id: newUser.id,
              email: newUser.email,
              fullName: newUser.fullName,
              updatedAt: new Date().toISOString(),
            });
            dispatch(setUser(newUser));
            dispatch(closeAuthModal());
          }
        } else {
          const { data, error: sbError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (sbError) throw sbError;
          if (data.user) {
            const user = {
              id: data.user.id,
              email: data.user.email || email,
              fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            };
            await db.profiles.put({
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              updatedAt: new Date().toISOString(),
            });
            dispatch(setUser(user));
            dispatch(closeAuthModal());
          }
        }
      } else {
        // Offline / Local auth mode
        const localUser = {
          id: `usr_${Date.now()}`,
          email,
          fullName: fullName || email.split('@')[0],
        };

        await db.profiles.put({
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.fullName,
          updatedAt: new Date().toISOString(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
        <button
          onClick={() => dispatch(closeAuthModal())}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">
            {authMode === 'signup' ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {authMode === 'signup'
              ? 'Join Split Up to track and share expenses effortlessly'
              : 'Sign in to access your groups and balances'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  suppressHydrationWarning
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Hisham"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                suppressHydrationWarning
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                suppressHydrationWarning
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
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
            className="text-xs text-indigo-400 hover:underline"
          >
            {authMode === 'signup'
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};
