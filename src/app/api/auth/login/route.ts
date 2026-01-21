import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

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

// POST - Email-based login (for dev mode and legacy support)
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const authDisabled =
      process.env.NEXT_PUBLIC_DISABLE_AUTH?.trim() === 'true' ||
      process.env.DISABLE_AUTH?.trim() === 'true';

    // In dev mode, set mock user cookie
    if (authDisabled) {
      const response = NextResponse.json({ success: true, user: MOCK_USER });
      response.cookies.set('ai-intranet-user', JSON.stringify({ ...MOCK_USER, timestamp: Date.now() }), {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 86400,
        path: '/',
      });
      return response;
    }

    // In production, look up user in database
    const { data: profile, error } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('id, email, full_name, app_role, manager_id, manager_email, department, title')
      .ilike('email', email)
      .eq('is_active', true)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Email not found in system' }, { status: 401 });
    }

    const sessionUser = {
      id: profile.id,
      auth0_id: profile.email,
      email: profile.email,
      full_name: profile.full_name,
      app_role: profile.app_role || 'user',
      app_permissions: {},
      department: profile.department,
      title: profile.title,
      timestamp: Date.now()
    };

    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('ai-intranet-user', JSON.stringify(sessionUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

// GET - OAuth redirect (for production Auth0 flow)
export async function GET(request: NextRequest) {
  try {
    const authDisabled =
      process.env.NEXT_PUBLIC_DISABLE_AUTH?.trim() === 'true' ||
      process.env.DISABLE_AUTH?.trim() === 'true';

    if (authDisabled) {
      return NextResponse.redirect(new URL('/', request.nextUrl.origin));
    }

    const auth0IssuerUrl = process.env.AUTH0_ISSUER_BASE_URL;
    const clientId = process.env.AUTH0_CLIENT_ID;
    const baseUrl = process.env.AUTH0_BASE_URL;
    const auth0Domain = auth0IssuerUrl?.replace('https://', '');
    const redirectUri = `${baseUrl}/api/auth/callback`;

    if (!auth0Domain || !clientId) {
      return NextResponse.json({ error: 'Auth0 configuration missing' }, { status: 500 });
    }

    const authorizeUrl = new URL(`https://${auth0Domain}/authorize`);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid profile email');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
