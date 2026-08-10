import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Supports new Supabase Publishable Key (sb_publishable_...) with fallback to legacy Anon key
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabasePublishableKey &&
  supabasePublishableKey.length > 10
);

let supabaseBrowserClientInstance: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase client instance for browser environments.
 * Supports modern Supabase Publishable API keys (sb_publishable_...) and legacy anon keys.
 */
export function createBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  if (!supabaseBrowserClientInstance) {
    supabaseBrowserClientInstance = createClient(supabaseUrl, supabasePublishableKey, {
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
