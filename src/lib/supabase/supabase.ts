import { createBrowserClient, isSupabaseConfigured } from './client';

export { isSupabaseConfigured, createBrowserClient };

export const supabase = createBrowserClient();
