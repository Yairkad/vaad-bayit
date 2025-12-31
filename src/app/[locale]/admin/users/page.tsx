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
import { Loader2, User, Building2, Plus, Trash2, X, Search } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Form state for editing user
  const [newMembership, setNewMembership] = useState({
    building_id: '',
    apartment_number: '',
    role: 'tenant' as 'committee' | 'tenant',
  });

  useEffect(() => {
    loadData();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    // Get current user to exclude from list
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setCurrentUserId(currentUser.id);
    }

    // Get profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Get building members separately (without nested join)
    const { data: membersData } = await supabase
      .from('building_members')
      .select('*');

    // Get all buildings for lookup
    const { data: allBuildingsData } = await supabase
      .from('buildings')
      .select('*');

    // Create a buildings lookup map
    const buildingsMap = new Map<string, Building>();
    (allBuildingsData || []).forEach((b: Building) => buildingsMap.set(b.id, b));

    // Merge building data into members
    const profiles = profilesData as Profile[] || [];
    const members = (membersData as BuildingMember[] || []).map(m => ({
      ...m,
      buildings: buildingsMap.get(m.building_id) || null,
    }));

    const profilesWithMembers = profiles.map(profile => ({
      ...profile,
      building_members: members.filter(m => m.user_id === profile.id),
    }));

    // Get approved buildings for the dropdown
    const approvedBuildings = (allBuildingsData || []).filter((b: Building) => b.is_approved);

    // Filter out current user and admins from the list
    const filteredUsers = profilesWithMembers.filter(
      u => u.id !== currentUser?.id && u.role !== 'admin'
    ) as ProfileWithMembership[];

    setUsers(filteredUsers);
    setBuildings(approvedBuildings);
    setIsLoading(false);
  };

  const openUserDialog = (user: ProfileWithMembership) => {
    setSelectedUser(user);
    setNewMembership({ building_id: '', apartment_number: '', role: 'tenant' });
    setIsDialogOpen(true);
  };

  const handleAddMembership = async () => {
    if (!selectedUser || !newMembership.building_id || !newMembership.apartment_number) {
      toast.error('יש למלא בניין ומספר דירה');
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('building_members').insert({
      building_id: newMembership.building_id,
      user_id: selectedUser.id,
      full_name: selectedUser.full_name,
      role: newMembership.role,
      apartment_number: newMembership.apartment_number,
      phone: selectedUser.phone,
    } as never);

    if (error) {
      if (error.code === '23505') {
        toast.error('המשתמש כבר משויך לדירה זו בבניין');
      } else {
        toast.error('שגיאה בהוספת שיוך');
      }
    } else {
      toast.success('השיוך נוסף בהצלחה');
      setNewMembership({ building_id: '', apartment_number: '', role: 'tenant' });
      await loadData();
      // Refresh selected user from updated users state
      setIsDialogOpen(false);
    }
    setIsSaving(false);
  };

  const handleRemoveMembership = async (membershipId: string) => {
    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('building_members')
      .delete()
      .eq('id', membershipId);

    if (error) {
      toast.error('שגיאה בהסרת שיוך');
    } else {
      toast.success('השיוך הוסר');
      await loadData();
      // Close dialog after removal
      setIsDialogOpen(false);
    }
    setIsSaving(false);
  };

  const handleUpdateMembershipRole = async (membershipId: string, newRole: 'committee' | 'tenant') => {
    setIsSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('building_members')
      .update({ role: newRole } as never)
      .eq('id', membershipId);

    if (error) {
      toast.error('שגיאה בעדכון התפקיד');
    } else {
      toast.success('התפקיד עודכן בהצלחה');
      await loadData();
      // Refresh the selected user data
      if (selectedUser) {
        const updatedUser = users.find(u => u.id === selectedUser.id);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    }
    setIsSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/delete-user?userId=${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה במחיקת המשתמש');
      }

      toast.success('המשתמש נמחק בהצלחה');
      setIsDialogOpen(false);
      setSelectedUser(null);
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת המשתמש');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get display role for a user
  const getDisplayRole = (user: ProfileWithMembership) => {
    const hasCommitteeRole = user.building_members?.some(m => m.role === 'committee');
    return hasCommitteeRole ? 'committee' : 'tenant';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'committee':
        return <Badge className="bg-blue-600">ועד</Badge>;
      default:
        return <Badge variant="secondary">דייר</Badge>;
    }
  };

  // Get unique cities for filter
  const cities = [...new Set(buildings.map(b => b.city).filter(Boolean))] as string[];

  // Filter users
  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = user.full_name?.toLowerCase().includes(query);
      const matchesPhone = user.phone?.includes(query);
      const matchesBuilding = user.building_members?.some(m =>
        m.buildings?.address?.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesPhone && !matchesBuilding) return false;
    }

    // Building filter
    if (filterBuilding !== 'all') {
      const hasBuilding = user.building_members?.some(m => m.building_id === filterBuilding);
      if (!hasBuilding) return false;
    }

    // City filter
    if (filterCity !== 'all') {
      const hasCity = user.building_members?.some(m => m.buildings?.city === filterCity);
      if (!hasCity) return false;
    }

    // Role filter
    if (filterRole !== 'all') {
      const displayRole = getDisplayRole(user);
      if (filterRole === 'unassigned') {
        if (user.building_members && user.building_members.length > 0) return false;
      } else if (displayRole !== filterRole) {
        return false;
      }
    }

    return true;
  });

  const stats = {
    total: users.length,
    withBuilding: users.filter(u => u.building_members && u.building_members.length > 0).length,
    withoutBuilding: users.filter(u => !u.building_members || u.building_members.length === 0).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" style={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">ניהול משתמשים</h1>
        <p className="text-sm sm:text-base text-muted-foreground">צפייה והגדרת הרשאות למשתמשים במערכת</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, טלפון או בניין..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger className="w-[140px] sm:w-[180px]">
              <SelectValue placeholder="בניין" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הבניינים</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[120px] sm:w-[150px]">
              <SelectValue placeholder="עיר" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הערים</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[120px] sm:w-[140px]">
              <SelectValue placeholder="תפקיד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התפקידים</SelectItem>
              <SelectItem value="committee">ועד בית</SelectItem>
              <SelectItem value="tenant">דייר</SelectItem>
              <SelectItem value="unassigned">לא משויך</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || filterBuilding !== 'all' || filterCity !== 'all' || filterRole !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterBuilding('all');
                setFilterCity('all');
                setFilterRole('all');
              }}
            >
              נקה פילטרים
            </Button>
          )}
        </div>

        {filteredUsers.length !== users.length && (
          <p className="text-sm text-muted-foreground">
            מציג {filteredUsers.length} מתוך {users.length} משתמשים
          </p>
        )}
      </div>

      {/* Stats */}
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
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-100 shrink-0">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1 sm:w-full">
                <p className="text-xs text-muted-foreground truncate">לא משויכים</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.withoutBuilding}</p>
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
        {filteredUsers.map((user) => {
          const displayRole = getDisplayRole(user);
          const memberships = user.building_members || [];
          return (
            <Card
              key={user.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openUserDialog(user)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{user.full_name}</span>
                    </div>
                    {getRoleBadge(displayRole)}
                  </div>
                  {user.phone && (
                    <p className="text-sm text-muted-foreground" dir="ltr">{user.phone}</p>
                  )}
                  {memberships.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {memberships.map((m) => (
                        <Badge key={m.id} variant="outline" className="text-xs">
                          {m.buildings?.address} - דירה {m.apartment_number}
                          {m.role === 'committee' && ' (ועד)'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {users.length === 0 ? 'אין משתמשים' : 'לא נמצאו משתמשים מתאימים'}
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
                <TableHead>בניינים</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>נרשם</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const displayRole = getDisplayRole(user);
                const memberships = user.building_members || [];
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openUserDialog(user)}
                  >
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell dir="ltr" className="text-left">
                      {user.phone || '-'}
                    </TableCell>
                    <TableCell>
                      {memberships.length === 0 ? (
                        <span className="text-muted-foreground">לא משויך</span>
                      ) : memberships.length === 1 ? (
                        <span>
                          {memberships[0].buildings?.address} - דירה {memberships[0].apartment_number}
                        </span>
                      ) : (
                        <span>{memberships.length} בניינים</span>
                      )}
                    </TableCell>
                    <TableCell>{getRoleBadge(displayRole)}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('he-IL')}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {users.length === 0 ? 'אין משתמשים' : 'לא נמצאו משתמשים מתאימים'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.full_name}</DialogTitle>
            <DialogDescription>
              {selectedUser?.phone && <span dir="ltr">{selectedUser.phone}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Building Memberships */}
            <div className="space-y-3">
              <Label className="text-base font-medium">שיוכים לבניינים</Label>

              {selectedUser?.building_members?.map((membership) => (
                <div key={membership.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{membership.buildings?.address}</p>
                    <p className="text-sm text-muted-foreground">
                      דירה {membership.apartment_number}
                    </p>
                  </div>
                  <Select
                    value={membership.role}
                    onValueChange={(value: 'committee' | 'tenant') =>
                      handleUpdateMembershipRole(membership.id, value)
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">דייר</SelectItem>
                      <SelectItem value="committee">ועד</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMembership(membership.id)}
                    disabled={isSaving}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {(!selectedUser?.building_members || selectedUser.building_members.length === 0) && (
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  המשתמש לא משויך לאף בניין
                </p>
              )}

              {/* Add New Membership */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-medium">הוסף שיוך לבניין</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={newMembership.building_id}
                    onValueChange={(value) => setNewMembership({ ...newMembership, building_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר בניין" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="מס׳ דירה"
                    value={newMembership.apartment_number}
                    onChange={(e) => setNewMembership({ ...newMembership, apartment_number: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={newMembership.role}
                    onValueChange={(value: 'committee' | 'tenant') =>
                      setNewMembership({ ...newMembership, role: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">דייר</SelectItem>
                      <SelectItem value="committee">ועד בית</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddMembership}
                    disabled={isSaving || !newMembership.building_id}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete User */}
            {selectedUser?.id !== currentUserId && (
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחק משתמש לצמיתות
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  פעולה זו אינה ניתנת לביטול
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
