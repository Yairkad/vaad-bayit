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
import { Plus, Check, X, Loader2, Building2, Trash2, Pencil, UserPlus } from 'lucide-react';
import type { Building, Profile, BuildingMember } from '@/types/database';

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
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const [formData, setFormData] = useState({
    address: '',
    city: '',
  });

  const [userFormData, setUserFormData] = useState({
    user_id: '',
    apartment_number: '',
    role: 'committee' as 'committee' | 'tenant',
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
    setFormData({ address: '', city: '' });
    setEditingBuilding(null);
  };

  const resetUserForm = () => {
    setUserFormData({ user_id: '', apartment_number: '', role: 'committee' });
    setSelectedBuilding(null);
  };

  const openEditDialog = (building: Building) => {
    setEditingBuilding(building);
    setFormData({
      address: building.address,
      city: building.city || '',
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

        const { error } = await supabase
          .from('buildings')
          .insert(buildingData as never);

        if (error) throw error;
        toast.success('הבניין נוסף בהצלחה');
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
    const supabase = createClient();

    try {
      // Get user details
      const selectedUser = users.find(u => u.id === userFormData.user_id);
      if (!selectedUser) throw new Error('משתמש לא נמצא');

      // Check if user already has membership in this building
      const { data: existingMember } = await supabase
        .from('building_members')
        .select('id')
        .eq('building_id', selectedBuilding.id)
        .eq('user_id', userFormData.user_id)
        .single();

      if (existingMember) {
        toast.error('המשתמש כבר משויך לבניין זה');
        return;
      }

      const { error } = await supabase
        .from('building_members')
        .insert({
          building_id: selectedBuilding.id,
          user_id: userFormData.user_id,
          full_name: selectedUser.full_name,
          apartment_number: userFormData.apartment_number,
          role: userFormData.role,
          phone: selectedUser.phone,
        } as never);

      if (error) throw error;

      toast.success('המשתמש נוסף לבניין בהצלחה');
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

  const approveBuilding = async (building: Building) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('buildings')
      .update({ is_approved: true } as never)
      .eq('id', building.id);

    if (error) {
      toast.error('שגיאה באישור');
      return;
    }

    toast.success('הבניין אושר');
    loadData();
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

  const filteredBuildings = buildings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !b.is_approved;
    if (filter === 'approved') return b.is_approved;
    return true;
  });

  const counts = {
    all: buildings.length,
    pending: buildings.filter(b => !b.is_approved).length,
    approved: buildings.filter(b => b.is_approved).length,
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

      {/* Add User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
        setIsUserDialogOpen(open);
        if (!open) resetUserForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת משתמש לבניין</DialogTitle>
            <DialogDescription>
              {selectedBuilding?.address}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>משתמש *</Label>
                <Select
                  value={userFormData.user_id}
                  onValueChange={(value) => setUserFormData({ ...userFormData, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר משתמש..." />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apartment">מספר דירה *</Label>
                  <Input
                    id="apartment"
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
                      <SelectItem value="committee">ועד בית</SelectItem>
                      <SelectItem value="tenant">דייר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={isSaving || !userFormData.user_id}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הוסף'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' && 'הכל'}
            {status === 'pending' && 'ממתין לאישור'}
            {status === 'approved' && 'מאושר'}
            <span className="mr-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
              {counts[status]}
            </span>
          </Button>
        ))}
      </div>

      {/* Cards View (Mobile & Tablet) */}
      <div className="lg:hidden grid gap-3 sm:grid-cols-2">
        {filteredBuildings.map((building) => (
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={building.is_approved ? 'default' : 'secondary'}>
                      {building.is_approved ? 'מאושר' : 'ממתין'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {building.member_count} דיירים
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!building.is_approved ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => approveBuilding(building)}
                        title="אשר"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBuilding(building)}
                        title="דחה"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  ) : (
                    <>
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
                        onClick={() => deleteBuilding(building)}
                        title="מחק"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredBuildings.length === 0 && (
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
                <TableHead>סטטוס</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{building.address}</TableCell>
                  <TableCell>{building.city || '-'}</TableCell>
                  <TableCell>{building.member_count}</TableCell>
                  <TableCell>
                    <Badge variant={building.is_approved ? 'default' : 'secondary'}>
                      {building.is_approved ? 'מאושר' : 'ממתין'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!building.is_approved ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => approveBuilding(building)}
                            title="אשר"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBuilding(building)}
                            title="דחה"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <>
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
                            onClick={() => deleteBuilding(building)}
                            title="מחק"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBuildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
