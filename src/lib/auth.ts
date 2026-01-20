import { cookies } from 'next/headers';
import { getSupabaseAdmin } from './supabase-admin';
import { UserProfile } from '@/types';

export async function getAuthenticatedUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('itp_user_id')?.value;

  if (!userId) {
    return null;
  }

  // Look up full profile from user_profiles
  const { data: profile, error } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('id, email, full_name, app_role, manager_id, manager_email')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as UserProfile;
}

export function canViewAssessment(
  currentUser: UserProfile,
  targetEmployeeId: string,
  targetManagerId: string | null,
  targetManagerEmail: string | null
): boolean {
  // User can view their own
  if (currentUser.id === targetEmployeeId) return true;

  // Admin can view all
  if (currentUser.app_role === 'admin') return true;

  // Manager can view direct reports
  if (targetManagerId === currentUser.id || targetManagerEmail === currentUser.email) {
    return true;
  }

  return false;
}

export function canEditAssessment(currentUser: UserProfile, targetEmployeeId: string): boolean {
  // User can edit their own
  if (currentUser.id === targetEmployeeId) return true;

  // Admin can edit all
  if (currentUser.app_role === 'admin') return true;

  return false;
}
