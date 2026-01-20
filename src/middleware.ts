import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get('itp_user_id')?.value;

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/api/auth');

  if (isProtectedRoute && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in and tries to access login page, redirect to home
  if (request.nextUrl.pathname === '/login' && userId) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
