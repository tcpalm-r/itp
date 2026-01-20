import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('itp_user_id');

  // Redirect to login page
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
