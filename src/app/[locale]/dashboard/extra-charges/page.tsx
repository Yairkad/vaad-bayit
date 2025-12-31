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
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Check, X, CreditCard } from 'lucide-react';
import type { Building, BuildingMember, ExtraCharge } from '@/types/database';

type MemberWithBuilding = BuildingMember & { buildings: Building | null };
type ChargeWithMember = ExtraCharge & { building_members: { full_name: string; apartment_number: string } | null };

export default function ExtraChargesPage() {
  const t = useTranslations();
  const confirm = useConfirm();
  const [charges, setCharges] = useState<ChargeWithMember[]>([]);
  const [members, setMembers] = useState<BuildingMember[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    reason: '',
    charge_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { data: membership } = await supabase
      .from('building_members')
      .select('building_id, buildings(*)')
      .eq('user_id', user.id)
      .eq('role', 'committee')
      .single() as { data: MemberWithBuilding | null };

    if (membership?.building_id) {
      setBuildingId(membership.building_id);
      setBuilding(membership.buildings);

      // Load members
      const { data: membersData } = await supabase
        .from('building_members')
        .select('*')
        .eq('building_id', membership.building_id)
        .order('apartment_number');

      if (membersData) {
        setMembers(membersData as BuildingMember[]);
      }

      // Load charges with member info
      const { data: chargesData } = await supabase
        .from('extra_charges')
        .select('*, building_members(full_name, apartment_number)')
        .eq('building_id', membership.building_id)
        .order('charge_date', { ascending: false });

      if (chargesData) {
        setCharges(chargesData as ChargeWithMember[]);
      }
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: '',
      reason: '',
      charge_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase
        .from('extra_charges')
        .insert({
          building_id: buildingId,
          member_id: formData.member_id,
          amount: Number(formData.amount),
          reason: formData.reason,
          charge_date: formData.charge_date,
          notes: formData.notes || null,
          created_by: user?.id,
        } as never);

      if (error) throw error;

      toast.success('החיוב הנוסף נוצר בהצלחה');
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

  const handleDelete = async (charge: ChargeWithMember) => {
    const confirmed = await confirm({
      title: 'מחיקת חיוב',
      description: 'האם למחוק את החיוב?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('extra_charges')
      .delete()
      .eq('id', charge.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('החיוב נמחק');
    loadData();
  };

  const togglePaid = async (charge: ChargeWithMember) => {
    const supabase = createClient();
    const newStatus = !charge.is_paid;

    const { error } = await supabase
      .from('extra_charges')
      .update({
        is_paid: newStatus,
        paid_at: newStatus ? new Date().toISOString() : null,
      } as never)
      .eq('id', charge.id);

    if (error) {
      toast.error('שגיאה בעדכון');
      return;
    }

    toast.success(newStatus ? 'סומן כשולם' : 'סומן כלא שולם');
    loadData();
  };

  const filteredCharges = charges.filter(charge => {
    if (filter === 'unpaid') return !charge.is_paid;
    if (filter === 'paid') return charge.is_paid;
    return true;
  });

  const totalUnpaid = charges.filter(c => !c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = charges.filter(c => c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0);

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
          <p className="text-muted-foreground">אין לך הרשאות ניהול</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(255, 183, 77, 0.06) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">חיובים נוספים</h1>
          <p className="text-muted-foreground">{building?.name} - דרישות תשלום מיוחדות לדיירים</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              חיוב חדש
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>יצירת חיוב נוסף</DialogTitle>
              <DialogDescription>
                הוספת דרישת תשלום מיוחדת לדייר
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>דייר *</Label>
                  <Select
                    value={formData.member_id}
                    onValueChange={(value) => setFormData({ ...formData, member_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר דייר" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          דירה {member.apartment_number} - {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">סכום (₪) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charge_date">תאריך *</Label>
                    <Input
                      id="charge_date"
                      type="date"
                      value={formData.charge_date}
                      onChange={(e) => setFormData({ ...formData, charge_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">סיבת החיוב *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="למשל: תיקון צנרת, השתתפות במעלית..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">הערות</Label>
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
                <Button type="submit" disabled={isSaving || !formData.member_id}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור חיוב'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">סה״כ חיובים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{charges.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">ממתינים לתשלום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₪{totalUnpaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">שולמו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₪{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          הכל ({charges.length})
        </Button>
        <Button
          variant={filter === 'unpaid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unpaid')}
        >
          ממתינים ({charges.filter(c => !c.is_paid).length})
        </Button>
        <Button
          variant={filter === 'paid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('paid')}
        >
          שולמו ({charges.filter(c => c.is_paid).length})
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filteredCharges.map((charge) => (
          <Card key={charge.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      דירה {charge.building_members?.apartment_number}
                    </span>
                    <Badge variant={charge.is_paid ? 'default' : 'secondary'}>
                      {charge.is_paid ? 'שולם' : 'ממתין'}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold">₪{Number(charge.amount).toLocaleString()}</p>
                  <p className="text-sm">{charge.reason}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(charge.charge_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePaid(charge)}
                    title={charge.is_paid ? 'סמן כלא שולם' : 'סמן כשולם'}
                  >
                    {charge.is_paid ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-600" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(charge)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredCharges.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין חיובים נוספים
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">רשימת חיובים נוספים</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>דירה</TableHead>
                <TableHead>דייר</TableHead>
                <TableHead>סיבה</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>סכום</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCharges.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell className="font-medium">
                    {charge.building_members?.apartment_number}
                  </TableCell>
                  <TableCell>{charge.building_members?.full_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{charge.reason}</TableCell>
                  <TableCell>
                    {new Date(charge.charge_date).toLocaleDateString('he-IL')}
                  </TableCell>
                  <TableCell className="font-medium">
                    ₪{Number(charge.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={charge.is_paid ? 'default' : 'secondary'}>
                      {charge.is_paid ? 'שולם' : 'ממתין'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePaid(charge)}
                        title={charge.is_paid ? 'סמן כלא שולם' : 'סמן כשולם'}
                      >
                        {charge.is_paid ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-600" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(charge)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCharges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    אין חיובים נוספים
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
