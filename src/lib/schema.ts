/**
 * Database Schema Type Definitions
 */

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

/**
 * User Profile - Core user data
 * Maps to existing user_profiles table
 */
export interface UserProfile {
  id: string;
  auth0_id: string | null;
  email: string;
  full_name: string;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
  avatar_url: string | null;

  // Roles and permissions
  global_role: string | null;
  app_role: string | null;
  app_permissions: Record<string, any> | null;
  app_access: boolean | null;
  capabilities: any | null;
  local_permissions: Record<string, any> | null;

  // Organizational info
  department: string | null;
  title: string | null;
  job_title: string | null;
  phone: string | null;
  location: string | null;
  manager_id: string | null;
  manager_email: string | null;
  employee_number: string | null;
  cost_center: string | null;
  external_id: string | null;

  // Login tracking
  has_logged_in: boolean | null;
  first_login_at: string | null;
  last_login_at: string | null;
  sync_method: string | null;

  // Metadata
  last_sync: string | null;
  is_active: boolean | null;
  is_hidden: boolean | null;
  scim_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  last_updated_by: string | null;
  idx: number;
}

/**
 * Session User - Simplified user info for session management
 */
export interface SessionUser {
  id: string;
  auth0_id?: string | null;
  email: string;
  full_name: string;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
  app_role: string;
  app_permissions: Record<string, any>;
  global_role?: string | null;
  capabilities?: any;
  app_access?: boolean;
  department: string | null;
  title: string | null;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AppRole = 'admin' | 'slt' | 'leader' | 'user';
export type GlobalRole = 'admin' | 'slt' | 'leader' | 'user';

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

export function isAdmin(user: UserProfile | SessionUser): boolean {
  return user.app_role === 'admin';
}

export function isLeader(user: UserProfile | SessionUser): boolean {
  return user.app_role === 'leader' || user.app_role === 'admin';
}
