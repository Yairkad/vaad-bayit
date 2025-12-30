'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        toast.error(t('auth.invalidCredentials'));
        return;
      }

      // Check for pending invite from registration
      const pendingInviteStr = localStorage.getItem('pendingInvite');
      if (pendingInviteStr && authData.user) {
        try {
          const pendingInvite = JSON.parse(pendingInviteStr);

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
                email: pendingInvite.email,
              } as never);

            if (!memberError) {
              // Update invite uses count
              await supabase
                .from('building_invites')
                .update({ uses_count: pendingInvite.uses_count + 1 } as never)
                .eq('id', pendingInvite.invite_id);

              toast.success('הצטרפת לבניין בהצלחה!');
            }
          }

          // Clear the pending invite
          localStorage.removeItem('pendingInvite');
        } catch (inviteError) {
          console.error('Error processing pending invite:', inviteError);
          localStorage.removeItem('pendingInvite');
        }
      }

      toast.success(t('common.success'));
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
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
