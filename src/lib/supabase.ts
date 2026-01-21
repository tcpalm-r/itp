/**
 * Supabase Client & Database Utilities
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Re-export types
export type { UserProfile, SessionUser, AppRole, GlobalRole } from './schema';
export { isAdmin, isLeader } from './schema';
