import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { db, LocalProfile } from '@/lib/db/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/supabase';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authMode: 'login' | 'signup';
  error: string | null;
}

const initialState: AuthState = {
  user: {
    id: 'usr_hisham',
    email: 'hisham@example.com',
    fullName: 'Hisham',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  isAuthenticated: true,
  isLoading: false,
  authModalOpen: false,
  authMode: 'login',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.isLoading = false;
      state.error = null;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    openAuthModal(state, action: PayloadAction<'login' | 'signup'>) {
      state.authMode = action.payload;
      state.authModalOpen = true;
      state.error = null;
    },
    closeAuthModal(state) {
      state.authModalOpen = false;
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      if (isSupabaseConfigured && supabase) {
        supabase.auth.signOut().catch(() => {});
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('split_up_offline_session');
      }
    },
  },
});

export const {
  setUser,
  setAuthLoading,
  setAuthError,
  openAuthModal,
  closeAuthModal,
  logout,
} = authSlice.actions;

export default authSlice.reducer;

/**
 * Initializes and restores auth session (both Supabase Auth and offline cached Dexie session).
 */
export async function initializeAuthSession(dispatch: any) {
  dispatch(setAuthLoading(true));

  try {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || 'user@example.com',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          avatarUrl: session.user.user_metadata?.avatar_url,
        };

        // Cache in Dexie for offline restoration
        await db.profiles.put({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          updatedAt: new Date().toISOString(),
        });

        dispatch(setUser(profile));
        return;
      }
    }

    // Restore cached offline session if offline or Supabase session unavailable
    const cachedProfile = await db.profiles.toCollection().first();
    if (cachedProfile) {
      dispatch(
        setUser({
          id: cachedProfile.id,
          email: cachedProfile.email,
          fullName: cachedProfile.fullName,
          avatarUrl: cachedProfile.avatarUrl,
        })
      );
    } else {
      dispatch(setAuthLoading(false));
    }
  } catch (err: any) {
    console.error('Failed to restore auth session:', err);
    dispatch(setAuthLoading(false));
  }
}
