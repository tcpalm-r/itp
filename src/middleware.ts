import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MOCK_USER = {
  id: '5b1e1ee7-5850-4b7f-8881-9304c17ab63f',
  auth0_id: 'thomas.palmer@sonance.com',
  email: 'thomas.palmer@sonance.com',
  full_name: 'Thomas Palmer',
  given_name: 'Thomas',
  family_name: 'Palmer',
  picture: null,
  app_role: 'admin',
  app_permissions: { manage_users: true, manage_reviews: true, manage_surveys: true, view_analytics: true },
  global_role: 'admin',
  capabilities: [],
  app_access: true,
  department: 'Engineering',
  title: 'Developer',
  timestamp: Date.now()
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

const base64UrlEncode = (input: Uint8Array | string): string => {
  const buffer = typeof input === 'string' ? Buffer.from(input) : Buffer.from(input);
  return buffer.toString('base64url');
};

const signAuthSyncToken = async (payload: Record<string, any>, secret: string): Promise<string> => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, Buffer.from(data));
  const encodedSignature = Buffer.from(signature).toString('base64url');
  return `${data}.${encodedSignature}`;
};

async function getLocalUserProfile(email: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, app_role, app_permissions')
      .ilike('email', email)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return { id: data.id, app_role: data.app_role || 'user', app_permissions: data.app_permissions || {} };
  } catch (error) {
    console.error('[Auth] Error fetching local user profile:', error);
    return null;
  }
}

function decodeJWT(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // ITP-specific skip paths
    const skipPaths = [
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/callback',
      '/api/auth/validate-token',
      '/api/auth/teams',
      '/api/auth/me',
      '/api/auth/sync',
      '/api/auth/switch-user',
      '/_next/',
      '/favicon',
      '/unauthorized',
      '/robots.txt',
      '/sitemap.xml',
      '/_next/static',
      '/_next/image',
      '/public',
      '/auth-start',
      '/auth-end',
      '/blank-auth-end',
      '/config'
    ];

    if (skipPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Teams context
    const isInTeams = request.nextUrl.searchParams.get('inTeams') === 'true';
    if (isInTeams) {
      const teamsSessionCookie = request.cookies.get('ai-intranet-user');
      if (teamsSessionCookie) {
        try {
          const session = JSON.parse(teamsSessionCookie.value);
          if (session.timestamp && Date.now() - session.timestamp < 86400000) {
            const localProfile = await getLocalUserProfile(session.email);
            if (localProfile) {
              // Fix the ID to use local DB ID (critical for FK constraints)
              session.id = localProfile.id;
              session.app_role = localProfile.app_role;
              session.app_permissions = localProfile.app_permissions;
            }
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-user-data', JSON.stringify(session));
            requestHeaders.set('x-user-id', session.auth0_id || session.id);
            requestHeaders.set('x-user-role', session.app_role);
            requestHeaders.set('x-user-email', session.email);
            return NextResponse.next({ request: { headers: requestHeaders } });
          }
        } catch {}
      }
      return NextResponse.next();
    }

    // Auth disabled check
    let authDisabled =
      process.env.NEXT_PUBLIC_DISABLE_AUTH?.trim() === 'true' ||
      process.env.DISABLE_AUTH?.trim() === 'true';

    // Production fail-safe
    if (process.env.NODE_ENV === 'production' && authDisabled) {
      console.error('[SECURITY] Auth bypass blocked in production');
      authDisabled = false;
    }

    if (authDisabled) {
      const existingUserCookie = request.cookies.get('ai-intranet-user');
      let currentUser = MOCK_USER;

      if (existingUserCookie) {
        try {
          currentUser = JSON.parse(existingUserCookie.value);
        } catch {}
      }

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-data', JSON.stringify(currentUser));
      requestHeaders.set('x-user-id', currentUser.auth0_id || currentUser.id);
      requestHeaders.set('x-user-role', currentUser.app_role);
      requestHeaders.set('x-user-email', currentUser.email);

      const response = NextResponse.next({ request: { headers: requestHeaders } });

      if (!existingUserCookie) {
        response.cookies.set('ai-intranet-user', JSON.stringify(MOCK_USER), {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          maxAge: 86400
        });
      }
      return response;
    }

    // URL token auth
    const authToken = request.nextUrl.searchParams.get('auth_token');
    if (authToken) {
      try {
        const tokenUrl = `${process.env.AI_INTRANET_URL}/api/auth/central-check?application=${process.env.APP_ID}&auth_token=${authToken}`;
        const validateResponse = await fetch(tokenUrl, {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.APP_API_KEY || '',
            'Authorization': `Bearer ${process.env.APP_API_KEY}`,
          },
          cache: 'no-store'
        });

        if (validateResponse.ok) {
          const data = await validateResponse.json();
          const access = data.access || data.granted;
          const user = data.user || (data.users && data.users[0]) || null;

          if (access && user) {
            const localProfile = await getLocalUserProfile(user.email);
            const appPermissions = user.app_permissions?.['ITP'] || {};
            const mappedUser = {
              id: localProfile?.id || user.id,  // Use local DB ID for FK constraints
              auth0_id: user.auth0_id,
              email: user.email,
              full_name: user.full_name,
              given_name: user.given_name,
              family_name: user.family_name,
              picture: user.picture || user.avatar_url,
              app_role: localProfile?.app_role || appPermissions.role || user.app_role || 'user',
              app_permissions: localProfile?.app_permissions || appPermissions.permissions || {},
              global_role: user.global_role || user.role,
              capabilities: user.capabilities || [],
              app_access: true,
              department: user.department,
              title: user.title,
              timestamp: Date.now()
            };

            // Sync profile (fire and forget)
            const authSyncSecret = process.env.AUTH_SYNC_SECRET;
            if (authSyncSecret) {
              const syncPayload = { user: mappedUser, iat: Date.now() };
              const syncToken = await signAuthSyncToken(syncPayload, authSyncSecret);
              fetch(`${request.nextUrl.origin}/api/auth/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-sync-token': syncToken },
              }).catch(() => {});
            }

            const cleanUrl = new URL(request.url);
            cleanUrl.searchParams.delete('auth_token');
            const response = NextResponse.redirect(cleanUrl);
            response.cookies.set('ai-intranet-user', JSON.stringify(mappedUser), {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 86400
            });
            return response;
          }
        }
      } catch {}
    }

    // Session cookie auth
    const sessionCookie = request.cookies.get('ai-intranet-user');
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value);
        if (session.timestamp && Date.now() - session.timestamp < 86400000) {
          const localProfile = await getLocalUserProfile(session.email);
          if (localProfile) {
            // Fix the ID to use local DB ID (critical for FK constraints)
            session.id = localProfile.id;
            session.app_role = localProfile.app_role;
            session.app_permissions = localProfile.app_permissions;
          }

          const requestHeaders = new Headers(request.headers);
          requestHeaders.set('x-user-data', JSON.stringify(session));
          requestHeaders.set('x-user-id', session.auth0_id);
          requestHeaders.set('x-user-role', session.app_role);
          requestHeaders.set('x-user-email', session.email);

          const response = NextResponse.next({ request: { headers: requestHeaders } });
          if (localProfile) {
            response.cookies.set('ai-intranet-user', JSON.stringify(session), {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 86400
            });
          }
          return response;
        }
      } catch {}
    }

    // Cookie-based auth with hub
    try {
      const authUrl = `${process.env.AI_INTRANET_URL}/api/auth/central-check?application=${process.env.APP_ID}`;
      const authResponse = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.APP_API_KEY}`,
          'Cookie': request.headers.get('cookie') || '',
          'User-Agent': request.headers.get('user-agent') || '',
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || '',
        },
        cache: 'no-store'
      });

      if (authResponse.status === 401) {
        const loginUrl = new URL('/login', process.env.AI_INTRANET_URL);
        const returnTo = new URL(request.url);
        returnTo.searchParams.delete('auth_token');
        loginUrl.searchParams.set('returnTo', returnTo.toString());
        loginUrl.searchParams.set('app', process.env.APP_ID || '');
        return NextResponse.redirect(loginUrl);
      }

      if (authResponse.status === 403) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      if (!authResponse.ok) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      const data = await authResponse.json();
      const access = data.access || data.granted;
      const user = data.user || (data.users && data.users[0]) || null;

      if (!access || !user) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      const localProfile = await getLocalUserProfile(user.email);
      const appPermissions = user.app_permissions?.['ITP'] || {};
      const mappedUser = {
        id: localProfile?.id || user.id,  // Use local DB ID for FK constraints
        auth0_id: user.auth0_id,
        email: user.email,
        full_name: user.full_name,
        given_name: user.given_name,
        family_name: user.family_name,
        picture: user.picture,
        app_role: localProfile?.app_role || appPermissions.role || user.app_role || 'user',
        app_permissions: localProfile?.app_permissions || appPermissions.permissions || {},
        global_role: user.global_role || user.role,
        capabilities: user.capabilities || [],
        app_access: true,
        department: user.department,
        title: user.title,
        timestamp: Date.now()
      };

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-data', JSON.stringify(mappedUser));
      requestHeaders.set('x-user-id', mappedUser.auth0_id);
      requestHeaders.set('x-user-role', mappedUser.app_role);
      requestHeaders.set('x-user-email', mappedUser.email);

      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.cookies.set('ai-intranet-user', JSON.stringify(mappedUser), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400
      });
      return response;

    } catch (error) {
      // Fallback to hub login
      const loginUrl = new URL('/login', process.env.AI_INTRANET_URL);
      const returnTo = new URL(request.url);
      returnTo.searchParams.delete('auth_token');
      loginUrl.searchParams.set('returnTo', returnTo.toString());
      loginUrl.searchParams.set('app', process.env.APP_ID || '');
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    const loginUrl = new URL('/login', process.env.AI_INTRANET_URL);
    loginUrl.searchParams.set('returnTo', request.url);
    loginUrl.searchParams.set('app', process.env.APP_ID || '');
    return NextResponse.redirect(loginUrl);
  }
}

// ITP-specific matcher
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|unauthorized|public).*)',
  ],
};
