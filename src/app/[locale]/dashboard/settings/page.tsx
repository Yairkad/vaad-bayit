'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Key, ArrowRight, LogOut } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { Profile, BuildingMember, Building } from '@/types/database';

type MemberWithBuilding = BuildingMember & { buildings: Building | null };

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<MemberWithBuilding | null>(null);
  const [userEmail, setUserEmail] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    setUserEmail(user.email || '');

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: Profile | null };

    if (profileData) {
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
      });
    }

    // Load building membership
    const { data: membershipData } = await supabase
      .from('building_members')
      .select('*, buildings(*)')
      .eq('user_id', user.id)
      .single() as { data: MemberWithBuilding | null };

    if (membershipData) {
      setMembership(membershipData);
    }

    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        } as never)
        .eq('id', profile.id);

      if (error) throw error;

      // Also update name in building_members if membership exists
      if (membership) {
        await supabase
          .from('building_members')
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
          } as never)
          .eq('user_id', profile.id);
      }

      toast.success('הפרופיל עודכן בהצלחה');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בעדכון הפרופיל');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      toast.error('יש להזין את הסיסמה הנוכחית');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('הסיסמאות לא תואמות');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsChangingPassword(true);
    const supabase = createClient();

    try {
      // First verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        toast.error('הסיסמה הנוכחית שגויה');
        setIsChangingPassword(false);
        return;
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('הסיסמה שונתה בהצלחה');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בשינוי הסיסמה');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
          <p className="text-muted-foreground">ניהול הפרופיל והגדרות החשבון</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowRight className="h-4 w-4 ml-2" />
          חזרה
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              פרטים אישיים
            </CardTitle>
            <CardDescription>עדכון פרטי הפרופיל שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  value={userEmail}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">לא ניתן לשנות את כתובת המייל</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">{t('auth.fullName')}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('auth.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-0000000"
                  dir="ltr"
                />
              </div>

              {membership && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-muted-foreground">דירה</Label>
                  <p className="font-medium">{membership.apartment_number}</p>
                </div>
              )}

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('common.save')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              שינוי סיסמה
            </CardTitle>
            <CardDescription>עדכון סיסמת הכניסה</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">סיסמה חדשה</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אישור סיסמה</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'שנה סיסמה'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Logout Card */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <LogOut className="h-5 w-5" />
            התנתקות
          </CardTitle>
          <CardDescription>התנתקות מהמערכת</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" />
            התנתק מהמערכת
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
