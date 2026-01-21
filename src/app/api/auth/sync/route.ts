import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_TOKEN_AGE_MS = 5 * 60 * 1000;

const verifyAuthSyncToken = (token: string, secret: string): { user: Record<string, any>; iat: number } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = createHmac('sha256', secret).update(data).digest('base64url');

    const signatureBuffer = Buffer.from(encodedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payloadRaw = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadRaw);
    if (!payload?.user) return null;

    const iat = payload.iat;
    if (typeof iat !== 'number' || Math.abs(Date.now() - iat) > MAX_TOKEN_AGE_MS) return null;

    return payload;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const authSyncSecret = process.env.AUTH_SYNC_SECRET;
    if (!authSyncSecret && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Auth sync misconfigured' }, { status: 500 });
    }

    const authSyncToken = request.headers.get('x-auth-sync-token');
    if (!authSyncToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verifiedPayload = authSyncSecret ? verifyAuthSyncToken(authSyncToken, authSyncSecret) : null;
    if (!verifiedPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mappedUser = verifiedPayload.user;

    try {
      const supabaseModule = await import('@/lib/auth-supabase');
      const syncResult = await supabaseModule.syncUserProfileViaSupabase(mappedUser);
      return NextResponse.json({ success: true, profile: syncResult });
    } catch {
      return NextResponse.json({ success: true, message: 'User authenticated (sync failed)' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
