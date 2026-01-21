import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createAuthenticatedResponse } from '@/lib/auth';
import type { SessionUser } from '@/lib/schema';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const authDisabled =
      process.env.NEXT_PUBLIC_DISABLE_AUTH?.trim() === 'true' ||
      process.env.DISABLE_AUTH?.trim() === 'true';

    if (authDisabled) {
      return NextResponse.redirect(new URL('/', request.nextUrl.origin));
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
    }

    const auth0IssuerUrl = process.env.AUTH0_ISSUER_BASE_URL;
    const clientId = process.env.AUTH0_CLIENT_ID;
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    const baseUrl = process.env.AUTH0_BASE_URL;

    if (!auth0IssuerUrl || !clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
    }

    const tokenResponse = await fetch(`${auth0IssuerUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: `${auth0IssuerUrl}/api/v2/`,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${baseUrl}/api/auth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;
    const accessToken = tokenData.access_token;
    const idTokenPayload = decodeJWT(idToken);

    if (!idTokenPayload) {
      return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
    }

    const auth0Id = idTokenPayload.sub;
    const email = idTokenPayload.email;
    const fullName = idTokenPayload.name || email;
    const givenName = idTokenPayload.given_name;
    const familyName = idTokenPayload.family_name;
    const picture = idTokenPayload.picture;

    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .ilike('email', email)
      .single();

    let user = existingUser;

    if (lookupError && lookupError.code !== 'PGRST116') {
      return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
    }

    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          auth0_id: auth0Id,
          email: email,
          full_name: fullName,
          given_name: givenName,
          family_name: familyName,
          picture: picture,
          app_role: 'user',
          app_permissions: {},
          has_logged_in: true,
          first_login_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          sync_method: 'auth0',
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
      }
      user = newUser;
    } else {
      await supabaseAdmin
        .from('user_profiles')
        .update({ auth0_id: auth0Id, last_login_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      app_role: user.app_role || 'user',
      app_permissions: user.app_permissions || {},
      department: user.department,
      title: user.title,
    };

    const response = NextResponse.redirect(new URL('/', request.nextUrl.origin));
    return createAuthenticatedResponse(response, sessionUser, accessToken);
  } catch (error) {
    return NextResponse.redirect(new URL('/unauthorized', request.nextUrl.origin));
  }
}
