'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, Loader2, CheckCircle } from 'lucide-react';
import type { InsertTables, BuildingInvite, Building } from '@/types/database';

type InviteWithBuilding = BuildingInvite & { buildings: Building };

function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const [isLoading, setIsLoading] = useState(false);
  const [invite, setInvite] = useState<InviteWithBuilding | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    apartmentNumber: '',
  });

  useEffect(() => {
    if (inviteCode) {
      validateInvite(inviteCode);
    }
  }, [inviteCode]);

  const validateInvite = async (code: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('building_invites')
      .select('*, buildings(*)')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      setInviteError('קוד הזמנה לא תקין');
      return;
    }

    const inviteData = data as InviteWithBuilding;

    // Check if expired
    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      setInviteError('קוד ההזמנה פג תוקף');
      return;
    }

    // Check if max uses reached
    if (inviteData.max_uses && inviteData.uses_count >= inviteData.max_uses) {
      setInviteError('קוד ההזמנה מיצה את מספר השימושים המותרים');
      return;
    }

    setInvite(inviteData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }

    if (invite && !formData.apartmentNumber) {
      toast.error('יש להזין מספר דירה');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
          },
        },
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      // Create profile - the trigger should handle this, but as a fallback:
      if (authData.user) {
        const profileData: InsertTables<'profiles'> = {
          id: authData.user.id,
          full_name: formData.fullName,
          phone: formData.phone || null,
          role: 'tenant',
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData as never);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // If we have an invite, create building membership
        if (invite) {
          const { error: memberError } = await supabase
            .from('building_members')
            .insert({
              building_id: invite.building_id,
              user_id: authData.user.id,
              full_name: formData.fullName,
              apartment_number: formData.apartmentNumber,
              role: invite.default_role,
              phone: formData.phone || null,
              email: formData.email,
            } as never);

          if (memberError) {
            console.error('Membership creation error:', memberError);
          } else {
            // Update invite uses count
            await supabase
              .from('building_invites')
              .update({ uses_count: invite.uses_count + 1 } as never)
              .eq('id', invite.id);
          }
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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('auth.registerTitle')}</CardTitle>
        <CardDescription>{t('common.appName')}</CardDescription>
      </CardHeader>

      {/* Invite Status Banner */}
      {inviteCode && (
        <div className="px-6 pb-4">
          {invite ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">הזמנה לבניין: {invite.buildings.name}</p>
                  <p className="text-sm text-green-600">{invite.buildings.address}</p>
                </div>
              </div>
            </div>
          ) : inviteError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
              {inviteError}
            </div>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">מאמת קוד הזמנה...</span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('auth.fullName')}</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('auth.phone')}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="050-0000000"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Apartment Number - only show if invite exists */}
          {invite && (
            <div className="space-y-2">
              <Label htmlFor="apartmentNumber">מספר דירה *</Label>
              <Input
                id="apartmentNumber"
                name="apartmentNumber"
                type="text"
                placeholder="לדוגמה: 5"
                value={formData.apartmentNumber}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || Boolean(inviteCode && !invite)}>
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.register')
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function RegisterFormFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">הרשמה</CardTitle>
        <CardDescription>מערכת ניהול ועד בית</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<RegisterFormFallback />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
