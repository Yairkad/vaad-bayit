'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User, Building2, Phone, Mail } from 'lucide-react';
import type { Profile, BuildingMember, Building } from '@/types/database';

type MemberWithBuilding = BuildingMember & { buildings: Building | null };

export default function SettingsPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<MemberWithBuilding | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

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
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        } as never)
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('הפרופיל עודכן בהצלחה');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בעדכון הפרופיל');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'מנהל מערכת';
      case 'committee': return 'ועד בית';
      case 'tenant': return 'דייר';
      default: return role;
    }
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
      <div>
        <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
        <p className="text-muted-foreground">ניהול הפרופיל והגדרות החשבון</p>
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
                <Label htmlFor="full_name">{t('auth.fullName')}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{profile?.id}</span>
                </div>
                <p className="text-xs text-muted-foreground">לא ניתן לשנות את כתובת המייל</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('auth.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-0000000"
                />
              </div>

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

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              פרטי חשבון
            </CardTitle>
            <CardDescription>מידע על החשבון והבניין</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">תפקיד במערכת</Label>
              <p className="font-medium">{getRoleLabel(profile?.role || 'tenant')}</p>
            </div>

            {membership && (
              <>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">בניין</Label>
                  <p className="font-medium">{membership.buildings?.name || '-'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">כתובת</Label>
                  <p className="font-medium">{membership.buildings?.address || '-'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">דירה</Label>
                  <p className="font-medium">{membership.apartment_number}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">תפקיד בבניין</Label>
                  <p className="font-medium">{membership.role === 'committee' ? 'ועד בית' : 'דייר'}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">אופן תשלום</Label>
                  <p className="font-medium">
                    {membership.payment_method === 'standing_order' ? 'הוראת קבע' : 'מזומן'}
                    {membership.standing_order_active && ' (פעיל)'}
                  </p>
                </div>
              </>
            )}

            {!membership && (
              <p className="text-muted-foreground text-sm">
                אינך משויך לאף בניין כרגע
              </p>
            )}

            <div className="pt-4 border-t">
              <div className="space-y-1">
                <Label className="text-muted-foreground">נרשם בתאריך</Label>
                <p className="font-medium">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
