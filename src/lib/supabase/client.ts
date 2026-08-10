import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 10
);

let supabaseBrowserClientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase client instance for browser environments.
 * Follows modern Supabase JS v2 client initialization guidelines with session auto-refresh.
 */
export function createBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  if (!supabaseBrowserClientInstance) {
    supabaseBrowserClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'splitup_supabase_auth_token',
      },
    });
  }

  return supabaseBrowserClientInstance;
}
