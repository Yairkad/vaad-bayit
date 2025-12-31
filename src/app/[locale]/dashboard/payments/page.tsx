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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X, FileText, Loader2, Plus, Trash2, CreditCard, CircleDollarSign } from 'lucide-react';
import type { Payment, BuildingMember, Building, ExtraCharge } from '@/types/database';

type PaymentWithMember = Payment & {
  building_members: BuildingMember;
};

type ChargeWithMember = ExtraCharge & {
  building_members: { full_name: string; apartment_number: string } | null;
};

export default function PaymentsPage() {
  const t = useTranslations();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('monthly');

  // Monthly payments state
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [members, setMembers] = useState<BuildingMember[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Extra charges state
  const [charges, setCharges] = useState<ChargeWithMember[]>([]);
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [isSavingCharge, setIsSavingCharge] = useState(false);
  const [chargeFilter, setChargeFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [chargeFormData, setChargeFormData] = useState({
    member_id: '',
    amount: '',
    reason: '',
    charge_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (buildingId) {
      loadPayments();
      loadCharges();
    }
  }, [buildingId, selectedMonth]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Get user's building membership
    type MemberWithBuilding = BuildingMember & { buildings: Building | null };
    const { data: membership } = await supabase
      .from('building_members')
      .select('building_id, buildings(*)')
      .eq('user_id', user.id)
      .eq('role', 'committee')
      .single() as { data: MemberWithBuilding | null };

    if (membership?.building_id) {
      setBuildingId(membership.building_id);
      setBuilding(membership.buildings as Building);

      // Load all members
      const { data: membersData } = await supabase
        .from('building_members')
        .select('*')
        .eq('building_id', membership.building_id)
        .order('apartment_number');

      setMembers(membersData || []);
    }

    setIsLoading(false);
  };

  const loadPayments = async () => {
    if (!buildingId) return;

    const supabase = createClient();
    const monthStart = `${selectedMonth}-01`;

    const { data } = await supabase
      .from('payments')
      .select('*, building_members(*)')
      .eq('building_id', buildingId)
      .eq('month', monthStart)
      .order('created_at');

    setPayments((data as PaymentWithMember[]) || []);
  };

  const loadCharges = async () => {
    if (!buildingId) return;

    const supabase = createClient();
    const { data: chargesData } = await supabase
      .from('extra_charges')
      .select('*, building_members(full_name, apartment_number)')
      .eq('building_id', buildingId)
      .order('charge_date', { ascending: false });

    if (chargesData) {
      setCharges(chargesData as ChargeWithMember[]);
    }
  };

  const generateMonthlyPayments = async () => {
    if (!buildingId || !building) return;

    setIsGenerating(true);
    const supabase = createClient();
    const monthStart = `${selectedMonth}-01`;

    try {
      // Get existing payments for this month
      const existingMemberIds = payments.map(p => p.member_id);

      // Create payments for members who don't have one yet
      // Use member's custom monthly_amount if set, otherwise fall back to building's monthly_fee
      const newPayments = members
        .filter(m => !existingMemberIds.includes(m.id))
        .filter(member => {
          // Only create payment if we have a valid amount
          const amount = member.monthly_amount ?? building.monthly_fee ?? 0;
          return amount > 0;
        })
        .map(member => ({
          building_id: buildingId,
          member_id: member.id,
          month: monthStart,
          amount: member.monthly_amount ?? building.monthly_fee ?? 0,
          is_paid: member.payment_method === 'standing_order' && member.standing_order_active,
          payment_method: member.payment_method,
        }));

      // Count members who were skipped due to no valid amount
      const membersWithoutFee = members
        .filter(m => !existingMemberIds.includes(m.id))
        .filter(member => {
          const amount = member.monthly_amount ?? building.monthly_fee ?? 0;
          return amount <= 0;
        });

      if (newPayments.length > 0) {
        const { error } = await supabase
          .from('payments')
          .insert(newPayments as never);

        if (error) throw error;
        toast.success(`נוצרו ${newPayments.length} רשומות תשלום`);

        if (membersWithoutFee.length > 0) {
          toast.warning(`${membersWithoutFee.length} דיירים לא נוספו - חסר סכום תשלום חודשי`);
        }
        loadPayments();
      } else if (membersWithoutFee.length > 0) {
        toast.warning('לא ניתן ליצור תשלומים - יש להגדיר סכום תשלום חודשי לבניין או לדיירים');
      } else {
        toast.info('כל הדיירים כבר קיימים ברשימה לחודש זה');
      }
    } catch (error) {
      console.error(error);
      toast.error('שגיאה ביצירת התשלומים');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReceipt = (payment: PaymentWithMember) => {
    const member = payment.building_members;
    const paidDate = payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('he-IL') : new Date().toLocaleDateString('he-IL');
    const monthDate = new Date(payment.month);
    const monthName = monthDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    const addressWithCity = [building?.address, building?.city].filter(Boolean).join(', ');

    // Create receipt content
    const receiptContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>אישור תשלום ועד בית</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 40px;
            max-width: 650px;
            margin: 0 auto;
            background: #f8fafc;
            min-height: 100vh;
          }
          .receipt {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 32px;
            text-align: center;
          }
          .header-logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            margin-bottom: 12px;
            border-radius: 8px;
            background: white;
            padding: 4px;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .header .address {
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 32px;
          }
          .amount-box {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin-bottom: 28px;
          }
          .amount-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .amount-value {
            font-size: 36px;
            font-weight: 700;
            color: #1d4ed8;
          }
          .details {
            background: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            color: #64748b;
            font-size: 14px;
          }
          .detail-value {
            font-weight: 600;
            color: #1e293b;
            font-size: 14px;
          }
          .disclaimer {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .disclaimer-title {
            font-weight: 600;
            color: #92400e;
            font-size: 13px;
            margin-bottom: 4px;
          }
          .disclaimer-text {
            color: #a16207;
            font-size: 12px;
            line-height: 1.5;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .footer-text {
            color: #94a3b8;
            font-size: 11px;
            line-height: 1.6;
          }
          .checkmark {
            width: 48px;
            height: 48px;
            background: #22c55e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
          }
          .checkmark::after {
            content: '✓';
            color: white;
            font-size: 24px;
            font-weight: bold;
          }
          @media print {
            body {
              padding: 0;
              background: white;
            }
            .receipt {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            ${building?.logo_url ? `<img src="${building.logo_url}" alt="לוגו" class="header-logo" />` : ''}
            <h1>אישור תשלום ועד בית</h1>
            <div class="address">${addressWithCity}</div>
          </div>
          <div class="content">
            <div class="checkmark"></div>
            <div class="amount-box">
              <div class="amount-label">סכום ששולם</div>
              <div class="amount-value">₪${Number(payment.amount).toLocaleString()}</div>
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">שם הדייר</span>
                <span class="detail-value">${member?.full_name || ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">מספר דירה</span>
                <span class="detail-value">${member?.apartment_number || ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">עבור חודש</span>
                <span class="detail-value">${monthName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">תאריך תשלום</span>
                <span class="detail-value">${paidDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">אמצעי תשלום</span>
                <span class="detail-value">${payment.payment_method === 'standing_order' ? 'הוראת קבע' : 'מזומן'}</span>
              </div>
            </div>
            <div class="disclaimer">
              <div class="disclaimer-title">שימו לב</div>
              <div class="disclaimer-text">
                מסמך זה מהווה אישור פנימי בלבד לצורכי תיעוד ועד הבית.
                אין להתייחס למסמך זה כחשבונית מס, קבלה רשמית או כל מסמך בעל תוקף חשבונאי או משפטי.
              </div>
            </div>
            <div class="footer">
              <div class="footer-text">
                אישור זה הופק אוטומטית ע"י מערכת ועד בית<br>
                תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} בשעה ${new Date().toLocaleTimeString('he-IL')}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const togglePayment = async (payment: Payment, isPaid: boolean) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('payments')
      .update({
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
      } as never)
      .eq('id', payment.id);

    if (error) {
      toast.error('שגיאה בעדכון');
      return;
    }

    toast.success(isPaid ? 'סומן כשולם' : 'סומן כלא שולם');
    loadPayments();
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  // Extra charges functions
  const resetChargeForm = () => {
    setChargeFormData({
      member_id: '',
      amount: '',
      reason: '',
      charge_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSavingCharge(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase
        .from('extra_charges')
        .insert({
          building_id: buildingId,
          member_id: chargeFormData.member_id,
          amount: Number(chargeFormData.amount),
          reason: chargeFormData.reason,
          charge_date: chargeFormData.charge_date,
          notes: chargeFormData.notes || null,
          created_by: user?.id,
        } as never);

      if (error) throw error;

      toast.success('החיוב הנוסף נוצר בהצלחה');
      setIsChargeDialogOpen(false);
      resetChargeForm();
      loadCharges();
    } catch (error) {
      console.error(error);
      toast.error('אירעה שגיאה');
    } finally {
      setIsSavingCharge(false);
    }
  };

  const handleDeleteCharge = async (charge: ChargeWithMember) => {
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
    loadCharges();
  };

  const toggleChargePaid = async (charge: ChargeWithMember) => {
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
    loadCharges();
  };

  const filteredCharges = charges.filter(charge => {
    if (chargeFilter === 'unpaid') return !charge.is_paid;
    if (chargeFilter === 'paid') return charge.is_paid;
    return true;
  });

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidAmount = payments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const unpaidAmount = totalAmount - paidAmount;

  const totalChargesUnpaid = charges.filter(c => !c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalChargesPaid = charges.filter(c => c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0);

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
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(254, 249, 195, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('payments.title')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-start">
          <TabsList className="inline-flex h-auto p-1 bg-yellow-100/80 rounded-lg gap-1">
            <TabsTrigger
              value="monthly"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-yellow-200/60 data-[state=inactive]:text-yellow-800"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">תשלומים חודשיים</span>
              <span className="sm:hidden">חודשי</span>
            </TabsTrigger>
            <TabsTrigger
              value="extra"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-yellow-200/60 data-[state=inactive]:text-yellow-800"
            >
              <CircleDollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">חיובים נוספים</span>
              <span className="sm:hidden">נוספים</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Monthly Payments Tab */}
        <TabsContent value="monthly" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateMonthlyPayments} disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="ml-2 h-4 w-4" />
                  צור תשלומים לחודש
                </>
              )}
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">סה״כ צפוי</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₪{totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">שולם</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₪{paidAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">לא שולם</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₪{unpaidAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">דירה {payment.building_members?.apartment_number}</span>
                        <Badge variant={payment.is_paid ? 'default' : 'destructive'}>
                          {payment.is_paid ? t('payments.paid') : t('payments.unpaid')}
                        </Badge>
                      </div>
                      <p className="font-medium">{payment.building_members?.full_name}</p>
                      <p className="text-lg font-bold">₪{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_method === 'standing_order'
                          ? t('tenants.standingOrder')
                          : t('tenants.cash')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {payment.is_paid ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePayment(payment, false)}
                        >
                          <X className="h-4 w-4 ml-1" />
                          בטל
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => togglePayment(payment, true)}
                        >
                          <Check className="h-4 w-4 ml-1" />
                          שולם
                        </Button>
                      )}
                      {payment.is_paid && (
                        <Button variant="ghost" size="sm" onClick={() => generateReceipt(payment)}>
                          <FileText className="h-4 w-4 ml-1" />
                          אישור
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {payments.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  אין תשלומים לחודש זה. לחץ על "צור תשלומים לחודש" ליצירת רשומות.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle className="text-lg">רשימת תשלומים</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('tenants.apartment')}</TableHead>
                    <TableHead>{t('tenants.tenantName')}</TableHead>
                    <TableHead>{t('tenants.paymentMethod')}</TableHead>
                    <TableHead>{t('common.amount')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.building_members?.apartment_number}
                      </TableCell>
                      <TableCell>{payment.building_members?.full_name}</TableCell>
                      <TableCell>
                        {payment.payment_method === 'standing_order'
                          ? t('tenants.standingOrder')
                          : t('tenants.cash')}
                      </TableCell>
                      <TableCell>₪{Number(payment.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={payment.is_paid ? 'default' : 'destructive'}>
                          {payment.is_paid ? t('payments.paid') : t('payments.unpaid')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {payment.is_paid ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePayment(payment, false)}
                            >
                              <X className="h-4 w-4 ml-1" />
                              בטל תשלום
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePayment(payment, true)}
                            >
                              <Check className="h-4 w-4 ml-1" />
                              סמן כשולם
                            </Button>
                          )}
                          {payment.is_paid && (
                            <Button variant="ghost" size="sm" onClick={() => generateReceipt(payment)}>
                              <FileText className="h-4 w-4 ml-1" />
                              אישור
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        אין תשלומים לחודש זה. לחץ על "צור תשלומים לחודש" ליצירת רשומות.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extra Charges Tab */}
        <TabsContent value="extra" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={isChargeDialogOpen} onOpenChange={(open) => {
              setIsChargeDialogOpen(open);
              if (!open) resetChargeForm();
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
                <form onSubmit={handleChargeSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>דייר *</Label>
                      <Select
                        value={chargeFormData.member_id}
                        onValueChange={(value) => setChargeFormData({ ...chargeFormData, member_id: value })}
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
                        <Label htmlFor="charge_amount">סכום (₪) *</Label>
                        <Input
                          id="charge_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={chargeFormData.amount}
                          onChange={(e) => setChargeFormData({ ...chargeFormData, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="charge_date">תאריך *</Label>
                        <Input
                          id="charge_date"
                          type="date"
                          value={chargeFormData.charge_date}
                          onChange={(e) => setChargeFormData({ ...chargeFormData, charge_date: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="charge_reason">סיבת החיוב *</Label>
                      <Input
                        id="charge_reason"
                        value={chargeFormData.reason}
                        onChange={(e) => setChargeFormData({ ...chargeFormData, reason: e.target.value })}
                        placeholder="למשל: תיקון צנרת, השתתפות במעלית..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="charge_notes">הערות</Label>
                      <Textarea
                        id="charge_notes"
                        value={chargeFormData.notes}
                        onChange={(e) => setChargeFormData({ ...chargeFormData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsChargeDialogOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={isSavingCharge || !chargeFormData.member_id}>
                      {isSavingCharge ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור חיוב'}
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
                <div className="text-2xl font-bold text-orange-600">₪{totalChargesUnpaid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">שולמו</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₪{totalChargesPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={chargeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChargeFilter('all')}
            >
              הכל ({charges.length})
            </Button>
            <Button
              variant={chargeFilter === 'unpaid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChargeFilter('unpaid')}
            >
              ממתינים ({charges.filter(c => !c.is_paid).length})
            </Button>
            <Button
              variant={chargeFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChargeFilter('paid')}
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
                        onClick={() => toggleChargePaid(charge)}
                        title={charge.is_paid ? 'סמן כלא שולם' : 'סמן כשולם'}
                      >
                        {charge.is_paid ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCharge(charge)}>
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
                            onClick={() => toggleChargePaid(charge)}
                            title={charge.is_paid ? 'סמן כלא שולם' : 'סמן כשולם'}
                          >
                            {charge.is_paid ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-600" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCharge(charge)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
