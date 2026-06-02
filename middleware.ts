import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  
  // Get token (Edge-safe, reads cookie directly)
  const token = await getToken({ req: request, secret });
  
  const { pathname } = request.nextUrl;

  // 1. If accessing login, and already logged in, redirect to role-based dashboard router
  if (pathname.startsWith('/login')) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 2. Protect all core application paths
  const protectedPrefixes = [
    '/dashboard',
    '/employees',
    '/attendance',
    '/leaves',
    '/payroll',
    '/performance',
    '/recruitment',
  ];

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;

    // Check specific dashboard route access
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (pathname.startsWith('/dashboard/manager') && role !== 'senior_manager' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (pathname.startsWith('/dashboard/hr') && role !== 'hr_recruiter' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (
      pathname.startsWith('/dashboard/employee') &&
      role !== 'employee' &&
      role !== 'senior_manager' &&
      role !== 'hr_recruiter' &&
      role !== 'admin'
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Recruitment module is only for HR Recruiter and Admin
    if (pathname.startsWith('/recruitment') && role !== 'admin' && role !== 'hr_recruiter') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/employees/:path*',
    '/attendance/:path*',
    '/leaves/:path*',
    '/payroll/:path*',
    '/performance/:path*',
    '/recruitment/:path*',
  ],
};
