'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Loader2, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check if user just verified their email
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedMessage(true);
      toast.success('המייל אומת בהצלחה! כעת ניתן להתחבר.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast.error('המייל או הסיסמה שגויים, או שהמשתמש לא רשום במערכת');
        } else if (error.message === 'Email not confirmed') {
          toast.error('יש לאשר את המייל לפני ההתחברות. בדוק את תיבת הדואר שלך.');
        } else {
          toast.error(error.message);
        }
        setIsLoading(false);
        return;
      }

      // Check for pending invite from registration (in database)
      if (authData.user?.email) {
        try {
          type PendingInvite = {
            id: string;
            building_id: string;
            invite_id: string;
            apartment_number: string;
            full_name: string;
            phone: string | null;
            default_role: string;
          };

          const { data: pendingInvite } = await supabase
            .from('pending_invites')
            .select('*')
            .eq('user_email', authData.user.email)
            .single() as { data: PendingInvite | null };

          if (pendingInvite) {
            // Check if user already has membership
            const { data: existingMember } = await supabase
              .from('building_members')
              .select('id')
              .eq('user_id', authData.user.id)
              .eq('building_id', pendingInvite.building_id)
              .single();

            if (!existingMember) {
              // Create building membership
              const { error: memberError } = await supabase
                .from('building_members')
                .insert({
                  building_id: pendingInvite.building_id,
                  user_id: authData.user.id,
                  full_name: pendingInvite.full_name,
                  apartment_number: pendingInvite.apartment_number,
                  role: pendingInvite.default_role,
                  phone: pendingInvite.phone || null,
                  email: authData.user.email,
                } as never);

              if (!memberError) {
                // Update invite uses count - fetch current count first
                const { data: inviteData } = await supabase
                  .from('building_invites')
                  .select('uses_count')
                  .eq('id', pendingInvite.invite_id)
                  .single() as { data: { uses_count: number } | null };

                if (inviteData) {
                  await supabase
                    .from('building_invites')
                    .update({ uses_count: inviteData.uses_count + 1 } as never)
                    .eq('id', pendingInvite.invite_id);
                }

                toast.success('הצטרפת לבניין בהצלחה!');
              }
            }

            // Delete the pending invite
            await supabase
              .from('pending_invites')
              .delete()
              .eq('id', pendingInvite.id);
          }
        } catch (inviteError) {
          console.error('Error processing pending invite:', inviteError);
        }
      }

      // Show success and redirect
      setIsRedirecting(true);
      toast.success('התחברת בהצלחה! מעביר אותך...');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error(t('common.error'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('common.appName')}</CardDescription>
        </CardHeader>
        {showVerifiedMessage && (
          <div className="mx-6 mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">המייל אומת בהצלחה!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              כעת ניתן להתחבר למערכת. ניתן לסגור את הטאב הזה ולחזור לטאב המקורי.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="text-left">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || isRedirecting}>
              {isLoading || isRedirecting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {isRedirecting ? 'מעביר אותך...' : t('common.loading')}
                </>
              ) : (
                t('auth.login')
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link href="/register" className="text-primary hover:underline">
                {t('auth.register')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
