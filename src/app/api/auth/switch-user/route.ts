import { NextRequest, NextResponse } from 'next/server';
import { AUTH_DISABLED, USER_COOKIE, SESSION_DURATION, TEST_USERS } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TEST_USER_IDS = TEST_USERS.map(u => u.id);

export async function POST(request: NextRequest) {
  if (!AUTH_DISABLED) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const baseUser = TEST_USERS.find(u => u.email === email);
    if (!baseUser) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
    }

    const { data: dbUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, app_role, department, title')
      .eq('id', baseUser.id)
      .single();

    const user = {
      ...baseUser,
      app_role: dbUser?.app_role || baseUser.app_role,
      department: baseUser.department || dbUser?.department,
      title: baseUser.title || dbUser?.title,
    };

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, full_name: user.full_name, app_role: user.app_role }
    });

    response.cookies.set(USER_COOKIE, JSON.stringify(user), {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to switch user' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!AUTH_DISABLED) {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const { data: dbUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, app_role, department, title')
      .in('id', TEST_USER_IDS);

    const dbUserMap = new Map((dbUsers || []).map(u => [u.id, u]));

    const users = TEST_USERS.map(baseUser => {
      const dbUser = dbUserMap.get(baseUser.id);
      return {
        id: baseUser.id,
        email: baseUser.email,
        full_name: baseUser.full_name,
        app_role: dbUser?.app_role || baseUser.app_role,
        department: baseUser.department || dbUser?.department,
        title: baseUser.title || dbUser?.title,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch test users' }, { status: 500 });
  }
}
