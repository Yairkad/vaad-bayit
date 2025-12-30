import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/he/dashboard';
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password reset, redirect to reset-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/he/reset-password`);
      }

      // For email verification (signup), redirect to login with success message
      // This is better UX because the user opened this in a new tab from email
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(`${origin}/he/login?verified=true`);
      }

      // Otherwise redirect to the next page or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/he/login?error=auth_callback_error`);
}
