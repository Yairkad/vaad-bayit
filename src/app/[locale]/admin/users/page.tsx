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
import { Badge } from '@/components/ui/badge';
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
import { Loader2, User, Shield, Building2, UserCog, Plus } from 'lucide-react';
import type { Profile, Building, BuildingMember } from '@/types/database';

type ProfileWithMembership = Profile & {
  building_members?: (BuildingMember & { buildings: Building | null })[];
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ProfileWithMembership[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ProfileWithMembership | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    role: 'tenant' as 'admin' | 'committee' | 'tenant',
    building_id: '',
    building_role: 'tenant' as 'committee' | 'tenant',
    apartment_number: '',
  });

  const [addFormData, setAddFormData] = useState({
    full_name: '',
    phone: '',
    role: 'tenant' as 'admin' | 'committee' | 'tenant',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    // Load all profiles with their building memberships
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*, building_members(*, buildings(*))')
      .order('created_at', { ascending: false });

    // Load all approved buildings
    const { data: buildingsData } = await supabase
      .from('buildings')
      .select('*')
      .eq('is_approved', true)
      .order('name');

    setUsers((profilesData as ProfileWithMembership[]) || []);
    setBuildings(buildingsData || []);
    setIsLoading(false);
  };

  const openEditDialog = (user: ProfileWithMembership) => {
    setSelectedUser(user);
    const membership = user.building_members?.[0];
    setFormData({
      role: user.role as 'admin' | 'committee' | 'tenant',
      building_id: membership?.building_id || '',
      building_role: (membership?.role as 'committee' | 'tenant') || 'tenant',
      apartment_number: membership?.apartment_number || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      // Update profile role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: formData.role } as never)
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Handle building membership
      if (formData.building_id && formData.apartment_number) {
        const existingMembership = selectedUser.building_members?.[0];

        if (existingMembership) {
          // Update existing membership
          const { error: memberError } = await supabase
            .from('building_members')
            .update({
              building_id: formData.building_id,
              role: formData.building_role,
              apartment_number: formData.apartment_number,
            } as never)
            .eq('id', existingMembership.id);

          if (memberError) throw memberError;
        } else {
          // Create new membership
          const { error: memberError } = await supabase
            .from('building_members')
            .insert({
              building_id: formData.building_id,
              user_id: selectedUser.id,
              full_name: selectedUser.full_name,
              role: formData.building_role,
              apartment_number: formData.apartment_number,
              phone: selectedUser.phone,
            } as never);

          if (memberError) throw memberError;
        }
      }

      toast.success('המשתמש עודכן בהצלחה');
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בעדכון');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Note: This creates a profile record, but the user won't be able to login
    // until they register through the auth system. This is for adding "managed" users.
    toast.info('הוספת משתמשים ידנית אינה נתמכת כרגע. משתמשים צריכים להירשם דרך דף ההרשמה.');
    setIsSaving(false);
    setIsAddDialogOpen(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-600">מנהל מערכת</Badge>;
      case 'committee':
        return <Badge className="bg-blue-600">ועד בית</Badge>;
      default:
        return <Badge variant="secondary">דייר</Badge>;
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    withBuilding: users.filter(u => u.building_members && u.building_members.length > 0).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">ניהול משתמשים</h1>
          <p className="text-sm sm:text-base text-muted-foreground">צפייה והגדרת הרשאות למשתמשים במערכת</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              הוסף משתמש
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוספת משתמש חדש</DialogTitle>
              <DialogDescription>
                משתמשים נרשמים דרך דף ההרשמה. כאן ניתן להוסיף דיירים מנוהלים.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="add_name">שם מלא *</Label>
                  <Input
                    id="add_name"
                    value={addFormData.full_name}
                    onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                    placeholder="ישראל ישראלי"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_phone">טלפון</Label>
                  <Input
                    id="add_phone"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תפקיד במערכת</Label>
                  <Select
                    value={addFormData.role}
                    onValueChange={(value: 'admin' | 'committee' | 'tenant') =>
                      setAddFormData({ ...addFormData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">דייר רגיל</SelectItem>
                      <SelectItem value="committee">ועד בית</SelectItem>
                      <SelectItem value="admin">מנהל מערכת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ביטול
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הוסף'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats - Compact on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 shrink-0">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">סה״כ משתמשים</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 shrink-0">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">מנהלי מערכת</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 shrink-0">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">משויכים לבניין</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.withBuilding}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {users.map((user) => {
          const membership = user.building_members?.[0];
          return (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-bold truncate">{user.full_name}</span>
                    </div>
                    {user.phone && (
                      <p className="text-sm text-muted-foreground" dir="ltr">{user.phone}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getRoleBadge(user.role)}
                      {membership && (
                        <Badge variant="outline" className="text-xs">
                          {membership.buildings?.address || membership.buildings?.name} - דירה {membership.apartment_number}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(user)}
                    title="ערוך הרשאות"
                    className="shrink-0"
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {users.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין משתמשים
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת משתמשים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם מלא</TableHead>
                <TableHead>טלפון</TableHead>
                <TableHead>תפקיד מערכת</TableHead>
                <TableHead>בניין</TableHead>
                <TableHead>דירה</TableHead>
                <TableHead>תפקיד בבניין</TableHead>
                <TableHead>נרשם</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const membership = user.building_members?.[0];
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell dir="ltr" className="text-left">
                      {user.phone || '-'}
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {membership?.buildings?.address || membership?.buildings?.name || (
                        <span className="text-muted-foreground">לא משויך</span>
                      )}
                    </TableCell>
                    <TableCell>{membership?.apartment_number || '-'}</TableCell>
                    <TableCell>
                      {membership ? (
                        <Badge variant={membership.role === 'committee' ? 'default' : 'outline'}>
                          {membership.role === 'committee' ? 'ועד' : 'דייר'}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('he-IL')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                        title="ערוך הרשאות"
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    אין משתמשים
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת הרשאות משתמש</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>תפקיד במערכת</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'committee' | 'tenant') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">דייר רגיל</SelectItem>
                    <SelectItem value="committee">ועד בית</SelectItem>
                    <SelectItem value="admin">מנהל מערכת</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  מנהל מערכת יכול לנהל את כל הבניינים והמשתמשים
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-medium">שיוך לבניין</Label>
              </div>

              <div className="space-y-2">
                <Label>בניין</Label>
                <Select
                  value={formData.building_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, building_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר בניין..." />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.building_id && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>מספר דירה</Label>
                      <Input
                        value={formData.apartment_number}
                        onChange={(e) =>
                          setFormData({ ...formData, apartment_number: e.target.value })
                        }
                        placeholder="לדוגמה: 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>תפקיד בבניין</Label>
                      <Select
                        value={formData.building_role}
                        onValueChange={(value: 'committee' | 'tenant') =>
                          setFormData({ ...formData, building_role: value })
                        }
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
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
