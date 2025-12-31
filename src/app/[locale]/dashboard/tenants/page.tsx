'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, UserX, Loader2, Search, Car, Package, Home, Phone, BookUser, Settings2, Calendar } from 'lucide-react';
import type { BuildingMember, Building, Profile, ParkingLot, OwnershipType } from '@/types/database';

type MemberWithProfile = BuildingMember & {
  buildings?: Building;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'email'> & { id: string } | null;
};

export default function TenantsPage() {
  const t = useTranslations();
  const confirm = useConfirm();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState<string>('');
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<BuildingMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('management');

  const [formData, setFormData] = useState({
    full_name: '',
    apartment_number: '',
    phone: '',
    phone2: '',
    email: '',
    role: 'tenant' as 'tenant' | 'committee',
    payment_method: 'standing_order' as 'cash' | 'standing_order',
    standing_order_active: false,
    payment_day: '',
    monthly_amount: '',
    notes: '',
    storage_number: '',
    parking_number: '',
    parking_type: '',
    ownership_type: 'owner' as OwnershipType,
    move_in_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Get user's building membership
    type MembershipWithBuilding = BuildingMember & { buildings: Building | null };
    const { data: membership } = await supabase
      .from('building_members')
      .select('building_id, buildings(*)')
      .eq('user_id', user.id)
      .eq('role', 'committee')
      .single() as { data: MembershipWithBuilding | null };

    if (membership?.building_id) {
      setBuildingId(membership.building_id);
      const building = membership.buildings as Building;
      setBuildingName(building?.name || '');
      setParkingLots((building?.parking_lots as ParkingLot[]) || []);

      // Load all members of this building with profiles for email
      const { data: membersData } = await supabase
        .from('building_members')
        .select('*, profiles(id, full_name, phone, email)')
        .eq('building_id', membership.building_id)
        .order('apartment_number') as { data: MemberWithProfile[] | null };

      setMembers(membersData || []);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      apartment_number: '',
      phone: '',
      phone2: '',
      email: '',
      role: 'tenant',
      payment_method: 'standing_order',
      standing_order_active: false,
      payment_day: '',
      monthly_amount: '',
      notes: '',
      storage_number: '',
      parking_number: '',
      parking_type: '',
      ownership_type: 'owner',
      move_in_date: '',
    });
    setEditingMember(null);
  };

  const openEditDialog = (member: BuildingMember) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      apartment_number: member.apartment_number,
      phone: member.phone || '',
      phone2: (member as any).phone2 || '',
      email: member.email || '',
      role: member.role as 'tenant' | 'committee',
      payment_method: member.payment_method as 'cash' | 'standing_order',
      standing_order_active: member.standing_order_active,
      payment_day: member.payment_day?.toString() || '',
      monthly_amount: member.monthly_amount?.toString() || '',
      notes: member.notes || '',
      storage_number: member.storage_number || '',
      parking_number: member.parking_number || '',
      parking_type: member.parking_type || '',
      ownership_type: (member.ownership_type as OwnershipType) || 'owner',
      move_in_date: (member as any).move_in_date || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from('building_members')
          .update({
            full_name: formData.full_name,
            apartment_number: formData.apartment_number,
            phone: formData.phone || null,
            phone2: formData.phone2 || null,
            email: formData.email || null,
            role: formData.role,
            payment_method: formData.payment_method,
            standing_order_active: formData.standing_order_active,
            payment_day: formData.payment_day ? parseInt(formData.payment_day) : null,
            monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
            notes: formData.notes || null,
            storage_number: formData.storage_number || null,
            parking_number: formData.parking_number || null,
            parking_type: formData.parking_type || null,
            ownership_type: formData.ownership_type,
            move_in_date: formData.move_in_date || null,
          } as never)
          .eq('id', editingMember.id);

        if (error) throw error;
        toast.success('הדייר עודכן בהצלחה');
      } else {
        // Create new member
        const { error } = await supabase
          .from('building_members')
          .insert({
            building_id: buildingId,
            full_name: formData.full_name,
            apartment_number: formData.apartment_number,
            phone: formData.phone || null,
            phone2: formData.phone2 || null,
            email: formData.email || null,
            role: formData.role,
            payment_method: formData.payment_method,
            standing_order_active: formData.standing_order_active,
            payment_day: formData.payment_day ? parseInt(formData.payment_day) : null,
            monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
            notes: formData.notes || null,
            storage_number: formData.storage_number || null,
            parking_number: formData.parking_number || null,
            parking_type: formData.parking_type || null,
            ownership_type: formData.ownership_type,
            move_in_date: formData.move_in_date || null,
          } as never);

        if (error) throw error;
        toast.success('הדייר נוסף בהצלחה');
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

  const handleDelete = async (member: BuildingMember) => {
    const confirmed = await confirm({
      title: 'מחיקת דייר',
      description: `האם למחוק את ${member.full_name}?`,
      confirmText: 'מחק',
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('building_members')
      .delete()
      .eq('id', member.id);

    if (error) {
      toast.error('אירעה שגיאה במחיקה');
      return;
    }

    toast.success('הדייר נמחק');
    loadData();
  };

  // Filter members by search query (apartment, name, storage, parking, phone)
  const filteredMembers = members.filter(member => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.apartment_number.toLowerCase().includes(query) ||
      member.full_name.toLowerCase().includes(query) ||
      (member.storage_number && member.storage_number.toLowerCase().includes(query)) ||
      (member.parking_number && member.parking_number.toLowerCase().includes(query)) ||
      (member.phone && member.phone.includes(query)) ||
      ((member as any).phone2 && (member as any).phone2.includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!buildingId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            אין לך הרשאות ניהול לבניין כלשהו
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(200, 230, 201, 0.08) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('tenants.title')}</h1>
          <p className="text-muted-foreground">{buildingName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חפש דירה, שם, טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 w-64"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                {t('tenants.addTenant')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader className="text-center">
                <DialogTitle className="text-center">
                  {editingMember ? t('tenants.editTenant') : t('tenants.addTenant')}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {editingMember ? 'עריכת פרטי דייר' : 'הוספת דייר חדש לבניין'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">{t('tenants.tenantName')} *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apartment_number">{t('tenants.apartment')} *</Label>
                      <Input
                        id="apartment_number"
                        value={formData.apartment_number}
                        onChange={(e) => setFormData({ ...formData, apartment_number: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">טלפון 1</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone2">טלפון 2</Label>
                      <Input
                        id="phone2"
                        type="tel"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>תפקיד</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: 'tenant' | 'committee') =>
                          setFormData({ ...formData, role: value })
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
                    <div className="space-y-2">
                      <Label>{t('tenants.paymentMethod')}</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(value: 'cash' | 'standing_order') =>
                          setFormData({ ...formData, payment_method: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">{t('tenants.cash')}</SelectItem>
                          <SelectItem value="standing_order">{t('tenants.standingOrder')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.payment_method === 'standing_order' && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="standing_order_active"
                          checked={formData.standing_order_active}
                          onChange={(e) => setFormData({ ...formData, standing_order_active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="standing_order_active">{t('tenants.standingOrderActive')}</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_day">יום תשלום בחודש</Label>
                          <Input
                            id="payment_day"
                            type="number"
                            min="1"
                            max="31"
                            value={formData.payment_day}
                            onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                            placeholder="1-31"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monthly_amount">סכום חודשי (₪)</Label>
                          <Input
                            id="monthly_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.monthly_amount}
                            onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Ownership type and move-in date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        סוג בעלות
                      </Label>
                      <Select
                        value={formData.ownership_type}
                        onValueChange={(value: OwnershipType) =>
                          setFormData({ ...formData, ownership_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">בעל הדירה</SelectItem>
                          <SelectItem value="renter">שוכר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="move_in_date" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        תאריך כניסה
                      </Label>
                      <Input
                        id="move_in_date"
                        type="date"
                        value={formData.move_in_date}
                        onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Storage and Parking */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storage_number" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        מספר מחסן
                      </Label>
                      <Input
                        id="storage_number"
                        value={formData.storage_number}
                        onChange={(e) => setFormData({ ...formData, storage_number: e.target.value })}
                        placeholder="למשל: 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parking_number" className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        מספר חניה
                      </Label>
                      <Input
                        id="parking_number"
                        value={formData.parking_number}
                        onChange={(e) => setFormData({ ...formData, parking_number: e.target.value })}
                        placeholder="למשל: 12"
                      />
                    </div>
                  </div>

                  {/* Parking type - only shown if building has multiple parking lots */}
                  {parkingLots.length > 1 && (
                    <div className="space-y-2">
                      <Label>סוג חניון</Label>
                      <Select
                        value={formData.parking_type}
                        onValueChange={(value) => setFormData({ ...formData, parking_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג חניון" />
                        </SelectTrigger>
                        <SelectContent>
                          {parkingLots.map((lot) => (
                            <SelectItem key={lot.type} value={lot.type}>
                              {lot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">{t('common.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('common.save')
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs for Management and Phonebook */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            ניהול
          </TabsTrigger>
          <TabsTrigger value="phonebook" className="flex items-center gap-2">
            <BookUser className="h-4 w-4" />
            אלפון
          </TabsTrigger>
        </TabsList>

        {/* Management Tab */}
        <TabsContent value="management" className="mt-4">
          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">דירה {member.apartment_number}</span>
                        <Badge variant={member.role === 'committee' ? 'default' : 'secondary'}>
                          {member.role === 'committee' ? 'ועד' : 'דייר'}
                        </Badge>
                        {member.user_id ? (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-medium">{member.full_name}</p>
                      {member.phone && (
                        <p className="text-sm text-muted-foreground" dir="ltr">{member.phone}</p>
                      )}
                      {(member as any).phone2 && (
                        <p className="text-sm text-muted-foreground" dir="ltr">{(member as any).phone2}</p>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {member.storage_number && <span>מחסן: {member.storage_number}</span>}
                        {member.parking_number && <span>חניה: {member.parking_number}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(member)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredMembers.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {searchQuery ? 'לא נמצאו תוצאות לחיפוש' : 'אין דיירים. לחץ על "הוסף דייר" להוספת הדייר הראשון.'}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle className="text-lg">
                {filteredMembers.length} דיירים {searchQuery && `(מתוך ${members.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('tenants.apartment')}</TableHead>
                    <TableHead>{t('tenants.tenantName')}</TableHead>
                    <TableHead>בעלות</TableHead>
                    <TableHead>טלפון 1</TableHead>
                    <TableHead>טלפון 2</TableHead>
                    <TableHead>מחסן</TableHead>
                    <TableHead>חניה</TableHead>
                    <TableHead>משתמש</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.apartment_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{member.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {member.role === 'committee' ? 'ועד' : 'דייר'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.ownership_type === 'renter' ? 'secondary' : 'outline'}>
                          {member.ownership_type === 'renter' ? 'שוכר' : 'בעלים'}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">{member.phone || '-'}</TableCell>
                      <TableCell dir="ltr" className="text-left">{(member as any).phone2 || '-'}</TableCell>
                      <TableCell>{member.storage_number || '-'}</TableCell>
                      <TableCell>
                        {member.parking_number ? (
                          <span>
                            {member.parking_number}
                            {member.parking_type && parkingLots.length > 1 && (
                              <span className="text-xs text-muted-foreground mr-1">
                                ({parkingLots.find(p => p.type === member.parking_type)?.name || member.parking_type})
                              </span>
                            )}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {member.user_id ? (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(member)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {searchQuery ? 'לא נמצאו תוצאות לחיפוש' : 'אין דיירים. לחץ על "הוסף דייר" להוספת הדייר הראשון.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phonebook Tab */}
        <TabsContent value="phonebook" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                אלפון הבניין - {filteredMembers.length} דיירים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t('tenants.apartment')}</TableHead>
                    <TableHead>שם</TableHead>
                    <TableHead>טלפון 1</TableHead>
                    <TableHead>טלפון 2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-bold text-lg">{member.apartment_number}</TableCell>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {member.phone ? (
                          <a href={`tel:${member.phone}`} className="text-primary hover:underline">
                            {member.phone}
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {(member as any).phone2 ? (
                          <a href={`tel:${(member as any).phone2}`} className="text-primary hover:underline">
                            {(member as any).phone2}
                          </a>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {searchQuery ? 'לא נמצאו תוצאות לחיפוש' : 'אין דיירים'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
