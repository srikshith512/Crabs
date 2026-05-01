import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'cross-fetch';

/**
 * Supabase client that forwards the end-user JWT so PostgREST sets auth.uid()
 * for Row Level Security (required for inserts into projects, etc.).
 */
export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      fetch,
    },
  });
}
