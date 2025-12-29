'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, UserX, Loader2 } from 'lucide-react';
import type { BuildingMember, Building } from '@/types/database';

type MemberWithBuilding = BuildingMember & {
  buildings?: Building;
};

export default function TenantsPage() {
  const t = useTranslations();
  const [members, setMembers] = useState<MemberWithBuilding[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<BuildingMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    apartment_number: '',
    phone: '',
    email: '',
    role: 'tenant' as 'tenant' | 'committee',
    payment_method: 'cash' as 'cash' | 'standing_order',
    standing_order_active: false,
    notes: '',
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
      setBuildingName((membership.buildings as Building)?.name || '');

      // Load all members of this building
      const { data: membersData } = await supabase
        .from('building_members')
        .select('*')
        .eq('building_id', membership.building_id)
        .order('apartment_number');

      setMembers(membersData || []);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      apartment_number: '',
      phone: '',
      email: '',
      role: 'tenant',
      payment_method: 'cash',
      standing_order_active: false,
      notes: '',
    });
    setEditingMember(null);
  };

  const openEditDialog = (member: BuildingMember) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      apartment_number: member.apartment_number,
      phone: member.phone || '',
      email: member.email || '',
      role: member.role as 'tenant' | 'committee',
      payment_method: member.payment_method as 'cash' | 'standing_order',
      standing_order_active: member.standing_order_active,
      notes: member.notes || '',
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
            email: formData.email || null,
            role: formData.role,
            payment_method: formData.payment_method,
            standing_order_active: formData.standing_order_active,
            notes: formData.notes || null,
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
            email: formData.email || null,
            role: formData.role,
            payment_method: formData.payment_method,
            standing_order_active: formData.standing_order_active,
            notes: formData.notes || null,
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
    if (!confirm(`האם למחוק את ${member.full_name}?`)) return;

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('tenants.title')}</h1>
          <p className="text-muted-foreground">{buildingName}</p>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? t('tenants.editTenant') : t('tenants.addTenant')}
              </DialogTitle>
              <DialogDescription>
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
                    <Label htmlFor="phone">{t('auth.phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
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

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {members.map((member) => (
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
                  {member.email && (
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {member.payment_method === 'standing_order' ? (
                      <span className="flex items-center gap-1">
                        {t('tenants.standingOrder')}
                        {member.standing_order_active && (
                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">פעיל</Badge>
                        )}
                      </span>
                    ) : (
                      t('tenants.cash')
                    )}
                  </p>
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
        {members.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין דיירים. לחץ על "הוסף דייר" להוספת הדייר הראשון.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">
            {members.length} דיירים בבניין
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tenants.apartment')}</TableHead>
                <TableHead>{t('tenants.tenantName')}</TableHead>
                <TableHead>{t('auth.phone')}</TableHead>
                <TableHead>{t('auth.email')}</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>{t('tenants.paymentMethod')}</TableHead>
                <TableHead>משתמש</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.apartment_number}</TableCell>
                  <TableCell>{member.full_name}</TableCell>
                  <TableCell dir="ltr" className="text-left">{member.phone || '-'}</TableCell>
                  <TableCell>{member.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'committee' ? 'default' : 'secondary'}>
                      {member.role === 'committee' ? 'ועד' : 'דייר'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.payment_method === 'standing_order' ? (
                      <span className="flex items-center gap-1">
                        {t('tenants.standingOrder')}
                        {member.standing_order_active && (
                          <Badge variant="outline" className="text-green-600 border-green-600">פעיל</Badge>
                        )}
                      </span>
                    ) : (
                      t('tenants.cash')
                    )}
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
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    אין דיירים. לחץ על "הוסף דייר" להוספת הדייר הראשון.
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
