import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authDisabled =
      process.env.NEXT_PUBLIC_DISABLE_AUTH?.trim() === 'true' ||
      process.env.DISABLE_AUTH?.trim() === 'true';

    // In dev mode, just clear cookies and return success
    if (authDisabled) {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('user-session');
      response.cookies.delete('appSession');
      response.cookies.delete('ai-intranet-session');
      response.cookies.delete('ai-intranet-user');
      response.cookies.delete('itp_user_id');
      return response;
    }

    // In production, redirect to Sonance Hub logout
    const hubUrl = process.env.AI_INTRANET_URL || 'https://aiintranet.sonance.com';
    const loginUrl = new URL('/login', hubUrl);
    loginUrl.searchParams.set('returnTo', request.nextUrl.origin);
    loginUrl.searchParams.set('logout', 'true');

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('user-session');
    response.cookies.delete('appSession');
    response.cookies.delete('ai-intranet-session');
    response.cookies.delete('ai-intranet-user');
    response.cookies.delete('itp_user_id');

    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('user-session');
    response.cookies.delete('ai-intranet-user');
    return response;
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
