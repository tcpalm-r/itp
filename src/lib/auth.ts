/**
 * Authentication Core Library
 *
 * Handles AI Intranet authentication with dev bypass mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SessionUser } from './schema';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

export const AUTH_DISABLED =
  process.env.NEXT_PUBLIC_DISABLE_AUTH?.trim() === 'true' ||
  process.env.DISABLE_AUTH?.trim() === 'true';

/**
 * Mock user for local development
 * IMPORTANT: Uses REAL database ID for authorization checks to work
 */
export const MOCK_USER: SessionUser = {
  id: '5b1e1ee7-5850-4b7f-8881-9304c17ab63f', // Real DB ID
  auth0_id: 'thomas.palmer@sonance.com',
  email: 'thomas.palmer@sonance.com',
  full_name: 'Thomas Palmer',
  given_name: 'Thomas',
  family_name: 'Palmer',
  picture: undefined,
  app_role: 'admin',
  app_permissions: {
    manage_users: true,
    manage_reviews: true,
    manage_surveys: true,
    view_analytics: true,
  },
  global_role: 'admin',
  capabilities: [],
  app_access: true,
  department: 'Engineering',
  title: 'Software Engineer',
};

/**
 * Simplified test users for development - one of each role
 */
export const TEST_USERS: SessionUser[] = [
  MOCK_USER, // admin
  {
    id: 'e57dcddb-5249-4b76-894f-f44636e43d17',
    auth0_id: 'mikes@sonance.com',
    email: 'mikes@sonance.com',
    full_name: 'Mike Sonntag',
    given_name: 'Mike',
    family_name: 'Sonntag',
    picture: null,
    app_role: 'slt',
    app_permissions: { read: true, admin: true, write: true },
    global_role: 'user',
    capabilities: [],
    app_access: true,
    department: 'Sales',
    title: 'Chief Revenue Officer',
  },
  {
    id: '076bbd75-fce2-471a-a621-dc55070b37ba',
    auth0_id: 'alina.grijalva@sonance.com',
    email: 'alina.grijalva@sonance.com',
    full_name: 'Alina Grijalva',
    given_name: 'Alina',
    family_name: 'Grijalva',
    picture: null,
    app_role: 'user',
    app_permissions: { read: true, admin: false, write: false },
    global_role: 'user',
    capabilities: [],
    app_access: true,
    department: 'Executive',
    title: 'Executive Assistant',
  },
];

export const SESSION_COOKIE = 'ai-intranet-session';
export const USER_COOKIE = 'ai-intranet-user';
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// SESSION VALIDATION
// ============================================================================

export async function validateSession(token: string): Promise<SessionUser | null> {
  try {
    const aiIntranetUrl = process.env.AI_INTRANET_URL || process.env.NEXT_PUBLIC_AI_INTRANET_URL;
    const appId = process.env.APP_ID || process.env.NEXT_PUBLIC_APP_ID;
    const appApiKey = process.env.APP_API_KEY;

    if (!aiIntranetUrl || !appId) {
      console.error('AI Intranet configuration missing');
      return null;
    }

    const response = await fetch(`${aiIntranetUrl}/api/auth/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': appId,
        ...(appApiKey && { 'X-App-API-Key': appApiKey }),
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value || null;
}

export function getUserFromRequest(request: NextRequest): SessionUser | null {
  const userCookie = request.cookies.get(USER_COOKIE)?.value;
  if (!userCookie) return null;

  try {
    return JSON.parse(userCookie);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(userCookie));
    } catch {
      console.error('[Auth] Failed to parse user cookie');
      return null;
    }
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE HELPERS
// ============================================================================

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<SessionUser | null> {
  if (AUTH_DISABLED) return MOCK_USER;

  const cachedUser = getUserFromRequest(request);
  if (cachedUser) return cachedUser;

  const sessionToken = getSessionFromRequest(request);
  if (!sessionToken) return null;

  return await validateSession(sessionToken);
}

export function createAuthenticatedResponse(
  response: NextResponse,
  user: SessionUser,
  sessionToken?: string
): NextResponse {
  response.cookies.set(USER_COOKIE, encodeURIComponent(JSON.stringify(user)), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  if (sessionToken) {
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });
  }

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(USER_COOKIE);
  return response;
}

// ============================================================================
// ROUTE PROTECTION
// ============================================================================

export function isProtectedRoute(pathname: string): boolean {
  const publicRoutes = [
    '/unauthorized',
    '/login',
    '/api/auth',
    '/api/auth/validate-token',
    '/api/debug',
  ];
  return !publicRoutes.some(route => pathname.startsWith(route));
}

export function hasRole(user: SessionUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.app_role);
}

// ============================================================================
// AI INTRANET INTEGRATION
// ============================================================================

export async function exchangeAIIntranetToken(
  token: string
): Promise<{ user: SessionUser; sessionToken: string } | null> {
  try {
    const aiIntranetUrl = process.env.AI_INTRANET_URL || process.env.NEXT_PUBLIC_AI_INTRANET_URL;
    const appId = process.env.APP_ID || process.env.NEXT_PUBLIC_APP_ID;
    const appApiKey = process.env.APP_API_KEY;

    if (!aiIntranetUrl || !appId) {
      console.error('AI Intranet configuration missing');
      return null;
    }

    const response = await fetch(`${aiIntranetUrl}/api/auth/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': appId,
        ...(appApiKey && { 'X-App-API-Key': appApiKey }),
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return { user: data.user, sessionToken: data.sessionToken };
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

// ============================================================================
// CLIENT-SIDE AUTH HELPERS
// ============================================================================

export function getClientUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  let userCookie = cookies
    .find(c => c.trim().startsWith(`${USER_COOKIE}=`))
    ?.split('=').slice(1).join('=');

  if (userCookie) {
    try {
      return JSON.parse(userCookie);
    } catch {
      try {
        const decoded = decodeURIComponent(userCookie);
        const user = JSON.parse(decoded);
        document.cookie = `${USER_COOKIE}=${JSON.stringify(user)}; path=/; max-age=86400; SameSite=Lax`;
        return user;
      } catch {
        console.error('[getClientUser] Failed to parse cookie');
      }
    }
  }

  userCookie = cookies
    .find(c => c.trim().startsWith('user-session='))
    ?.split('=').slice(1).join('=');

  if (userCookie) {
    try {
      return JSON.parse(decodeURIComponent(userCookie));
    } catch {
      console.error('[getClientUser] Failed to parse user-session cookie');
    }
  }

  if (AUTH_DISABLED) return MOCK_USER;
  return null;
}

export function clearStaleDevCookies(): void {
  if (typeof window === 'undefined') return;

  const devCookiesToClear = ['x-auth-disabled', 'user-session', 'x-switched-user'];
  devCookiesToClear.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      redirect: 'follow'
    });

    if (!response.redirected) {
      const hubUrl = process.env.NEXT_PUBLIC_AI_INTRANET_URL || 'https://aiintranet.sonance.com';
      const loginUrl = new URL('/login', hubUrl);
      loginUrl.searchParams.set('returnTo', window.location.origin);
      loginUrl.searchParams.set('logout', 'true');
      window.location.href = loginUrl.toString();
    }
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    const hubUrl = process.env.NEXT_PUBLIC_AI_INTRANET_URL || 'https://aiintranet.sonance.com';
    const loginUrl = new URL('/login', hubUrl);
    loginUrl.searchParams.set('returnTo', window.location.origin);
    loginUrl.searchParams.set('logout', 'true');
    window.location.href = loginUrl.toString();
  }
}

// ============================================================================
// ITP-SPECIFIC AUTHORIZATION HELPERS
// ============================================================================

export interface ITPUser {
  id: string;
  email: string;
  full_name: string | null;
  app_role?: 'admin' | 'leader' | 'slt' | 'user';
  manager_id?: string | null;
  manager_email?: string | null;
}

export function canViewAssessment(
  currentUser: ITPUser,
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

export function canEditAssessment(currentUser: ITPUser, targetEmployeeId: string): boolean {
  // User can edit their own
  if (currentUser.id === targetEmployeeId) return true;

  // Admin can edit all
  if (currentUser.app_role === 'admin') return true;

  return false;
}
