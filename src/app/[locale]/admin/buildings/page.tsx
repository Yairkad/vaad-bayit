'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, Building2, Trash2, Pencil, UserPlus, Link2, Copy, Check } from 'lucide-react';
import type { Building, Profile, BuildingMember, BuildingInvite } from '@/types/database';

type BuildingWithCreator = Building & {
  profiles?: Profile;
  member_count?: number;
};

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<BuildingWithCreator[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [formData, setFormData] = useState({
    address: '',
    city: '',
    committee_user_id: '',
    committee_apartment: '',
    // For creating new committee user
    create_new_user: false,
    new_user_name: '',
    new_user_email: '',
    new_user_phone: '',
  });

  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    phone2: '',
    apartment_number: '',
    role: 'tenant' as 'committee' | 'tenant',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('buildings')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false }) as { data: Building[] | null };

    // Get member counts
    const buildingsWithCounts = await Promise.all(
      (data || []).map(async (building: Building) => {
        const { count } = await supabase
          .from('building_members')
          .select('*', { count: 'exact', head: true })
          .eq('building_id', building.id);

        return { ...building, member_count: count || 0 };
      })
    );

    // Load users without building membership
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    setUsers(profilesData || []);
    setBuildings(buildingsWithCounts as BuildingWithCreator[]);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      address: '',
      city: '',
      committee_user_id: '',
      committee_apartment: '',
      create_new_user: false,
      new_user_name: '',
      new_user_email: '',
      new_user_phone: '',
    });
    setEditingBuilding(null);
  };

  const resetUserForm = () => {
    setUserFormData({ full_name: '', email: '', phone: '', phone2: '', apartment_number: '', role: 'tenant' });
    setSelectedBuilding(null);
  };

  const openEditDialog = (building: Building) => {
    setEditingBuilding(building);
    setFormData({
      address: building.address,
      city: building.city || '',
      committee_user_id: '',
      committee_apartment: '',
      create_new_user: false,
      new_user_name: '',
      new_user_email: '',
      new_user_phone: '',
    });
    setIsDialogOpen(true);
  };

  const openAddUserDialog = (building: Building) => {
    setSelectedBuilding(building);
    setIsUserDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      if (editingBuilding) {
        // Update existing building
        const { error } = await supabase
          .from('buildings')
          .update({
            name: formData.address, // Use address as name
            address: formData.address,
            city: formData.city || null,
          } as never)
          .eq('id', editingBuilding.id);

        if (error) throw error;
        toast.success('הבניין עודכן בהצלחה');
      } else {
        // Create new building
        const buildingData = {
          name: formData.address, // Use address as name
          address: formData.address,
          city: formData.city || null,
          monthly_fee: 0, // Default, will be set by building admin
          is_approved: true,
          created_by: user?.id,
        };

        const { data: newBuilding, error } = await supabase
          .from('buildings')
          .insert(buildingData as never)
          .select()
          .single();

        if (error) throw error;

        const buildingId = (newBuilding as Building).id;

        // Add committee member
        if (formData.create_new_user && formData.new_user_email && formData.new_user_name && formData.committee_apartment) {
          // Create new user via API
          const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.new_user_email,
              full_name: formData.new_user_name,
              phone: formData.new_user_phone || null,
              building_id: buildingId,
              apartment_number: formData.committee_apartment,
              role: 'committee',
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error('Error creating user:', result.error);
            toast.error('הבניין נוסף אך הייתה שגיאה ביצירת הוועד: ' + result.error);
          } else {
            toast.success(result.isNewUser
              ? 'הבניין נוסף בהצלחה! נשלח מייל לוועד להגדרת סיסמה'
              : 'הבניין נוסף והוועד שויך בהצלחה'
            );
          }
        } else if (formData.committee_user_id && formData.committee_apartment) {
          // Add existing user
          const committeeUser = users.find(u => u.id === formData.committee_user_id);
          if (committeeUser && buildingId) {
            const { error: memberError } = await supabase
              .from('building_members')
              .insert({
                building_id: buildingId,
                user_id: formData.committee_user_id,
                full_name: committeeUser.full_name,
                apartment_number: formData.committee_apartment,
                role: 'committee',
                phone: committeeUser.phone,
              } as never);

            if (memberError) {
              console.error('Error adding committee member:', memberError);
              toast.error('הבניין נוסף אך הייתה שגיאה בהוספת הוועד');
            } else {
              toast.success('הבניין והוועד נוספו בהצלחה');
            }
          }
        } else {
          toast.success('הבניין נוסף בהצלחה');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('אירעה שגיאה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    setIsSaving(true);

    try {
      if (userFormData.email) {
        // Create new user via API (with email - will send password reset)
        const response = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userFormData.email,
            full_name: userFormData.full_name,
            phone: userFormData.phone || null,
            phone2: userFormData.phone2 || null,
            building_id: selectedBuilding.id,
            apartment_number: userFormData.apartment_number,
            role: userFormData.role,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error('שגיאה: ' + result.error);
          return;
        }

        toast.success(result.isNewUser
          ? 'המשתמש נוסף בהצלחה! נשלח מייל להגדרת סיסמה'
          : 'המשתמש שויך לבניין בהצלחה'
        );
      } else {
        // Add as managed tenant (no login - managed by committee)
        const supabase = createClient();
        const { error } = await supabase
          .from('building_members')
          .insert({
            building_id: selectedBuilding.id,
            user_id: null, // No user account - managed tenant
            full_name: userFormData.full_name,
            apartment_number: userFormData.apartment_number,
            role: userFormData.role,
            phone: userFormData.phone || null,
            phone2: userFormData.phone2 || null,
          } as never);

        if (error) throw error;
        toast.success('הדייר נוסף בהצלחה (ללא חשבון משתמש)');
      }

      setIsUserDialogOpen(false);
      resetUserForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('אירעה שגיאה');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBuilding = async (building: Building) => {
    if (!confirm('האם למחוק את הבניין? פעולה זו תמחק גם את כל הדיירים והנתונים הקשורים.')) return;

    const supabase = createClient();

    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', building.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('הבניין נמחק');
    loadData();
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const openInviteDialog = async (building: Building) => {
    setSelectedBuilding(building);
    setInviteLink(null);
    setCopiedInvite(false);
    setIsInviteDialogOpen(true);
  };

  const createCommitteeInvite = async () => {
    if (!selectedBuilding) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const code = generateInviteCode();

    const { error } = await supabase
      .from('building_invites')
      .insert({
        building_id: selectedBuilding.id,
        code,
        default_role: 'committee',
        max_uses: 1,
        is_active: true,
        created_by: user?.id,
      } as never);

    if (error) {
      console.error('Error creating invite:', error);
      toast.error('שגיאה ביצירת קישור ההזמנה');
    } else {
      const link = `${window.location.origin}/he/register?invite=${code}`;
      setInviteLink(link);
      toast.success('קישור ההזמנה נוצר בהצלחה');
    }

    setIsSaving(false);
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      toast.success('הקישור הועתק');
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      toast.error('שגיאה בהעתקה');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">ניהול בניינים</h1>
          <p className="text-muted-foreground">אישור וניהול בניינים במערכת</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              הוסף בניין
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBuilding ? 'עריכת בניין' : 'הוספת בניין חדש'}</DialogTitle>
              <DialogDescription>
                {editingBuilding ? 'עדכון פרטי הבניין' : 'הוספת בניין חדש למערכת'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address">כתובת *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="לדוגמה: רחוב הרצל 5"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">עיר</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="לדוגמה: תל אביב"
                  />
                </div>

                {/* Committee member selection - only for new buildings */}
                {!editingBuilding && (
                  <>
                    <div className="border-t pt-4">
                      <Label className="text-base font-medium">ועד בית (אופציונלי)</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        הוועד יוכל לנהל את הבניין ולהוסיף דיירים
                      </p>
                    </div>

                    {/* Toggle between existing user and new user */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!formData.create_new_user ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, create_new_user: false, new_user_name: '', new_user_email: '', new_user_phone: '' })}
                      >
                        משתמש קיים
                      </Button>
                      <Button
                        type="button"
                        variant={formData.create_new_user ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, create_new_user: true, committee_user_id: '' })}
                      >
                        משתמש חדש
                      </Button>
                    </div>

                    {!formData.create_new_user ? (
                      // Existing user selection
                      <div className="space-y-2">
                        <Label>משתמש</Label>
                        <Select
                          value={formData.committee_user_id}
                          onValueChange={(value) => setFormData({ ...formData, committee_user_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר משתמש לוועד..." />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name} {user.phone ? `(${user.phone})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      // New user form
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="new_user_name">שם מלא *</Label>
                          <Input
                            id="new_user_name"
                            value={formData.new_user_name}
                            onChange={(e) => setFormData({ ...formData, new_user_name: e.target.value })}
                            placeholder="ישראל ישראלי"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_user_email">אימייל *</Label>
                          <Input
                            id="new_user_email"
                            type="email"
                            value={formData.new_user_email}
                            onChange={(e) => setFormData({ ...formData, new_user_email: e.target.value })}
                            placeholder="example@email.com"
                            dir="ltr"
                          />
                          <p className="text-xs text-muted-foreground">
                            יישלח מייל להגדרת סיסמה
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new_user_phone">טלפון</Label>
                          <Input
                            id="new_user_phone"
                            value={formData.new_user_phone}
                            onChange={(e) => setFormData({ ...formData, new_user_phone: e.target.value })}
                            placeholder="050-1234567"
                            dir="ltr"
                          />
                        </div>
                      </>
                    )}

                    {(formData.committee_user_id || (formData.create_new_user && formData.new_user_email)) && (
                      <div className="space-y-2">
                        <Label htmlFor="committee_apartment">מספר דירה של הוועד *</Label>
                        <Input
                          id="committee_apartment"
                          value={formData.committee_apartment}
                          onChange={(e) => setFormData({ ...formData, committee_apartment: e.target.value })}
                          placeholder="לדוגמה: 1"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ביטול
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSaving ||
                    (!!formData.committee_user_id && !formData.committee_apartment) ||
                    !!(formData.create_new_user && formData.new_user_email && !formData.committee_apartment) ||
                    !!(formData.create_new_user && formData.new_user_email && !formData.new_user_name)
                  }
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Committee Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
        setIsInviteDialogOpen(open);
        if (!open) {
          setInviteLink(null);
          setCopiedInvite(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>קישור הזמנה לוועד</DialogTitle>
            <DialogDescription>
              {selectedBuilding?.address}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!inviteLink ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  צור קישור הזמנה חד-פעמי לוועד בית חדש.
                  <br />
                  המשתמש שיירשם דרך הקישור יקבל הרשאות ועד.
                </p>
                <Button onClick={createCommitteeInvite} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 ml-2" />
                      צור קישור הזמנה
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>קישור ההזמנה:</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    dir="ltr"
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyInviteLink}
                    className="shrink-0"
                  >
                    {copiedInvite ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  הקישור תקף לשימוש חד-פעמי בלבד
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
        setIsUserDialogOpen(open);
        if (!open) resetUserForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת דייר/משתמש לבניין</DialogTitle>
            <DialogDescription>
              {selectedBuilding?.address}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user_full_name">שם מלא *</Label>
                <Input
                  id="user_full_name"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  placeholder="ישראל ישראלי"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_apartment">מספר דירה *</Label>
                  <Input
                    id="user_apartment"
                    value={userFormData.apartment_number}
                    onChange={(e) => setUserFormData({ ...userFormData, apartment_number: e.target.value })}
                    placeholder="לדוגמה: 5"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>תפקיד</Label>
                  <Select
                    value={userFormData.role}
                    onValueChange={(value: 'committee' | 'tenant') => setUserFormData({ ...userFormData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">דייר</SelectItem>
                      <SelectItem value="committee">ועד בית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_phone">טלפון 1</Label>
                  <Input
                    id="user_phone"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_phone2">טלפון 2</Label>
                  <Input
                    id="user_phone2"
                    value={userFormData.phone2}
                    onChange={(e) => setUserFormData({ ...userFormData, phone2: e.target.value })}
                    placeholder="050-7654321"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_email">אימייל (אופציונלי)</Label>
                <Input
                  id="user_email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="example@email.com"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  {userFormData.email
                    ? 'יישלח מייל להגדרת סיסמה - המשתמש יוכל להתחבר למערכת'
                    : 'ללא אימייל - דייר מנוהל (לא יוכל להתחבר למערכת)'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isSaving || !userFormData.full_name || !userFormData.apartment_number}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הוסף'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cards View (Mobile & Tablet) */}
      <div className="lg:hidden grid gap-3 sm:grid-cols-2">
        {buildings.map((building) => (
          <Card key={building.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="font-bold truncate">{building.address}</span>
                  </div>
                  {building.city && (
                    <p className="text-sm text-muted-foreground truncate">{building.city}</p>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {building.member_count} דיירים
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(building)}
                    title="ערוך"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openAddUserDialog(building)}
                    title="הוסף משתמש"
                  >
                    <UserPlus className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openInviteDialog(building)}
                    title="קישור הזמנה לוועד"
                  >
                    <Link2 className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBuilding(building)}
                    title="מחק"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {buildings.length === 0 && (
          <Card className="sm:col-span-2">
            <CardContent className="p-6 text-center text-muted-foreground">
              אין בניינים
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת בניינים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>כתובת</TableHead>
                <TableHead>עיר</TableHead>
                <TableHead>דיירים</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{building.address}</TableCell>
                  <TableCell>{building.city || '-'}</TableCell>
                  <TableCell>{building.member_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(building)}
                        title="ערוך"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAddUserDialog(building)}
                        title="הוסף משתמש"
                      >
                        <UserPlus className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openInviteDialog(building)}
                        title="קישור הזמנה לוועד"
                      >
                        <Link2 className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBuilding(building)}
                        title="מחק"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {buildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    אין בניינים
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
