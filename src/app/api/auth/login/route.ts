import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check if email exists in user_profiles
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name, app_role, manager_id, manager_email')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Email not found in system' }, { status: 401 });
  }

  // Set session cookie with user ID
  const cookieStore = await cookies();
  cookieStore.set('itp_user_id', profile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return NextResponse.json({ success: true, user: profile });
}
