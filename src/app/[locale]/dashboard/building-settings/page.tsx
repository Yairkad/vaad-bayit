'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Building2, Image as ImageIcon, Upload, Trash2, CreditCard, MapPin, Car, Plus, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { Building, BuildingMember, ParkingLot } from '@/types/database';
import Image from 'next/image';

type MemberWithBuilding = BuildingMember & { buildings: Building | null };

export default function BuildingSettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [membership, setMembership] = useState<MemberWithBuilding | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    monthly_fee: '',
    opening_balance: '',
  });

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [newParkingName, setNewParkingName] = useState('');
  const [newParkingType, setNewParkingType] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Load building membership
    const { data: membershipData } = await supabase
      .from('building_members')
      .select('*, buildings(*)')
      .eq('user_id', user.id)
      .single() as { data: MemberWithBuilding | null };

    if (!membershipData || membershipData.role !== 'committee') {
      router.push('/dashboard');
      return;
    }

    setMembership(membershipData);

    if (membershipData.buildings) {
      const b = membershipData.buildings;
      setBuilding(b);
      setFormData({
        name: b.name || '',
        address: b.address || '',
        city: b.city || '',
        monthly_fee: b.monthly_fee?.toString() || '',
        opening_balance: b.opening_balance?.toString() || '',
      });
      setLogoPreview(b.logo_url || null);
      setParkingLots((b.parking_lots as ParkingLot[]) || []);
    }

    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          address: formData.address,
          city: formData.city || null,
          monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
          opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : 0,
        } as never)
        .eq('id', building.id);

      if (error) throw error;

      toast.success('הגדרות הבניין נשמרו בהצלחה');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בשמירת הגדרות הבניין');
    } finally {
      setIsSaving(false);
    }
  };

  const addParkingLot = async () => {
    if (!newParkingName.trim() || !newParkingType.trim() || !building) return;

    const updatedLots = [...parkingLots, { name: newParkingName.trim(), type: newParkingType.trim() }];

    const supabase = createClient();
    const { error } = await supabase
      .from('buildings')
      .update({ parking_lots: updatedLots } as never)
      .eq('id', building.id);

    if (error) {
      toast.error('שגיאה בהוספת חניון');
      return;
    }

    setParkingLots(updatedLots);
    setNewParkingName('');
    setNewParkingType('');
    toast.success('החניון נוסף בהצלחה');
  };

  const removeParkingLot = async (index: number) => {
    if (!building) return;

    const updatedLots = parkingLots.filter((_, i) => i !== index);

    const supabase = createClient();
    const { error } = await supabase
      .from('buildings')
      .update({ parking_lots: updatedLots } as never)
      .eq('id', building.id);

    if (error) {
      toast.error('שגיאה בהסרת חניון');
      return;
    }

    setParkingLots(updatedLots);
    toast.success('החניון הוסר');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !building) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('יש לבחור קובץ תמונה');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 2MB');
      return;
    }

    setIsUploadingLogo(true);
    const supabase = createClient();

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${building.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('building-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, show helpful message
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
          toast.error('יש ליצור bucket בשם building-logos ב-Supabase Storage');
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('building-logos')
        .getPublicUrl(fileName);

      // Update building with logo URL
      const { error: updateError } = await supabase
        .from('buildings')
        .update({ logo_url: publicUrl } as never)
        .eq('id', building.id);

      if (updateError) throw updateError;

      setLogoPreview(publicUrl);
      toast.success('הלוגו הועלה בהצלחה');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בהעלאת הלוגו');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!building) return;

    setIsUploadingLogo(true);
    const supabase = createClient();

    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('building-logos')
        .remove([`${building.id}/logo.png`, `${building.id}/logo.jpg`, `${building.id}/logo.jpeg`, `${building.id}/logo.webp`]);

      // Ignore delete errors (file might not exist)
      if (deleteError) {
        console.warn('Logo delete warning:', deleteError);
      }

      // Update building to remove logo URL
      const { error: updateError } = await supabase
        .from('buildings')
        .update({ logo_url: null } as never)
        .eq('id', building.id);

      if (updateError) throw updateError;

      setLogoPreview(null);
      toast.success('הלוגו הוסר בהצלחה');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בהסרת הלוגו');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">לא נמצא בניין</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(244, 244, 245, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">הגדרות בניין</h1>
        <p className="text-sm sm:text-base text-muted-foreground">ניהול פרטי הבניין והגדרות תשלום</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Building Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              פרטי הבניין
            </CardTitle>
            <CardDescription>מידע בסיסי על הבניין</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם הבניין</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="h-4 w-4 inline ml-1" />
                  כתובת
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">עיר</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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

        {/* Payment Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              הגדרות תשלום
            </CardTitle>
            <CardDescription>הגדרות תשלומי ועד בית</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">סכום תשלום חודשי (₪)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_fee}
                  onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  סכום זה ישמש כברירת מחדל לכל הדיירים. ניתן להגדיר סכום שונה לדייר ספציפי בדף הדיירים.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_balance">יתרת פתיחה (₪)</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  יתרת הפתיחה של הקופה לפני תחילת השימוש במערכת
                </p>
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

        {/* Parking Lots Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              הגדרות חניונים
            </CardTitle>
            <CardDescription>
              הגדר את סוגי החניונים בבניין (למשל: עליון, תחתון, מקורה)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing parking lots */}
            {parkingLots.length > 0 && (
              <div className="space-y-2">
                <Label>חניונים קיימים</Label>
                <div className="space-y-2">
                  {parkingLots.map((lot, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-medium">{lot.name}</span>
                        <span className="text-muted-foreground text-sm mr-2">({lot.type})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParkingLot(index)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new parking lot */}
            <div className="space-y-2 border-t pt-4">
              <Label>הוסף חניון חדש</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="שם החניון (למשל: חניון עליון)"
                  value={newParkingName}
                  onChange={(e) => setNewParkingName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="סוג (למשל: upper)"
                  value={newParkingType}
                  onChange={(e) => setNewParkingType(e.target.value)}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addParkingLot}
                  disabled={!newParkingName.trim() || !newParkingType.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                הסוג משמש לזיהוי פנימי. דוגמאות: upper, lower, covered, external
              </p>
            </div>

            {parkingLots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                אין חניונים מוגדרים. הוסף חניון כדי לאפשר לדיירים לציין סוג חניה.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Logo Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              לוגו הבניין
            </CardTitle>
            <CardDescription>
              לוגו או תמונה שתוצג במסמכים והודעות שמופקים מהמערכת
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={logoPreview}
                      alt="לוגו הבניין"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    העלה תמונה או לוגו עבור הבניין. התמונה תוצג בקבלות, מסמכים והודעות.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    פורמטים נתמכים: PNG, JPG, WebP. גודל מקסימלי: 2MB
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Upload className="h-4 w-4 ml-2" />
                    )}
                    {logoPreview ? 'החלף לוגו' : 'העלה לוגו'}
                  </Button>

                  {logoPreview && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      הסר לוגו
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
