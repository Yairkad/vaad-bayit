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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, User, Shield, Building2, UserCog } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    role: 'tenant' as 'admin' | 'committee' | 'tenant',
    building_id: '',
    building_role: 'tenant' as 'committee' | 'tenant',
    apartment_number: '',
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
        <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
        <p className="text-muted-foreground">צפייה והגדרת הרשאות למשתמשים במערכת</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              סה״כ משתמשים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              מנהלי מערכת
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              משויכים לבניין
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.building_members && u.building_members.length > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
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
                      {membership?.buildings?.name || (
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
                        {building.name} - {building.address}
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
                      <input
                        type="text"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
