import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First, handle i18n routing
  const response = intlMiddleware(request);

  // If no Supabase URL is configured, just return the i18n response
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return response;
  }

  // Create Supabase client for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get user session
  const { data: { user } } = await supabase.auth.getUser();

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/admin', '/tenant'];
  const authRoutes = ['/login', '/register', '/forgot-password'];

  const pathname = request.nextUrl.pathname;
  // Remove locale prefix for route checking
  const pathWithoutLocale = pathname.replace(/^\/(he|en)/, '') || '/';

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.some(route => pathWithoutLocale.startsWith(route))) {
    const locale = pathname.match(/^\/(he|en)/)?.[1] || 'he';
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (user && authRoutes.some(route => pathWithoutLocale.startsWith(route))) {
    const locale = pathname.match(/^\/(he|en)/)?.[1] || 'he';
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/', '/(he|en)/:path*', '/((?!api|_next|.*\\..*).*)']
};
