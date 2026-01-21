import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const AZURE_TENANT_ID = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID;
const AZURE_CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID;

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const payload = decodeJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const validAudiences = [
      AZURE_CLIENT_ID,
      `api://${AZURE_CLIENT_ID}`,
    ].filter(Boolean);

    const tokenAudience = (payload.aud as string || '').toLowerCase();
    const isValidAudience = validAudiences.some(
      expected => expected && tokenAudience === expected.toLowerCase()
    );

    if (!isValidAudience) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 401 });
    }

    if (payload.tid !== AZURE_TENANT_ID) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 401 });
    }

    const email = (payload.upn || payload.preferred_username || payload.email) as string;
    const name = payload.name as string;
    const oid = payload.oid as string;

    if (!email) {
      return NextResponse.json({ error: 'No email in token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userProfile, error: dbError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (dbError || !userProfile) {
      return NextResponse.json({
        error: 'User not found',
        email,
        message: 'Contact admin for access.',
      }, { status: 403 });
    }

    const sessionUser = {
      id: userProfile.id,
      auth0_id: email,
      email: userProfile.email,
      full_name: userProfile.full_name || name || email.split('@')[0],
      given_name: userProfile.given_name || (name ? name.split(' ')[0] : null),
      family_name: userProfile.family_name || (name ? name.split(' ').slice(1).join(' ') : null),
      picture: userProfile.avatar_url || userProfile.picture || null,
      app_role: userProfile.app_role || 'user',
      app_permissions: userProfile.app_permissions || {},
      global_role: userProfile.app_role,
      capabilities: [],
      app_access: true,
      department: userProfile.department,
      title: userProfile.title,
      timestamp: Date.now(),
      azure_oid: oid,
      auth_source: 'teams',
    };

    const response = NextResponse.json({ success: true, user: sessionUser });

    response.cookies.set('ai-intranet-user', JSON.stringify(sessionUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: !!(AZURE_TENANT_ID && AZURE_CLIENT_ID),
  });
}
