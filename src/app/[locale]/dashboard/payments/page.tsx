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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, X, FileText, Loader2, Plus } from 'lucide-react';
import type { Payment, BuildingMember, Building } from '@/types/database';

type PaymentWithMember = Payment & {
  building_members: BuildingMember;
};

export default function PaymentsPage() {
  const t = useTranslations();
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (buildingId) {
      loadPayments();
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

  const generateMonthlyPayments = async () => {
    if (!buildingId || !building) return;

    setIsGenerating(true);
    const supabase = createClient();
    const monthStart = `${selectedMonth}-01`;

    try {
      // Get existing payments for this month
      const existingMemberIds = payments.map(p => p.member_id);

      // Create payments for members who don't have one yet
      const newPayments = members
        .filter(m => !existingMemberIds.includes(m.id))
        .map(member => ({
          building_id: buildingId,
          member_id: member.id,
          month: monthStart,
          amount: building.monthly_fee,
          is_paid: member.payment_method === 'standing_order' && member.standing_order_active,
          payment_method: member.payment_method,
        }));

      if (newPayments.length > 0) {
        const { error } = await supabase
          .from('payments')
          .insert(newPayments as never);

        if (error) throw error;
        toast.success(`נוצרו ${newPayments.length} רשומות תשלום`);
        loadPayments();
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

    // Create receipt content
    const receiptContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>אישור תשלום</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .content {
            line-height: 1.8;
          }
          .field {
            margin: 15px 0;
          }
          .field-label {
            font-weight: bold;
            color: #555;
          }
          .amount {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            text-align: center;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #888;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>אישור תשלום</h1>
          <p>${building?.name || ''}</p>
          <p>${building?.address || ''}</p>
        </div>
        <div class="content">
          <div class="field">
            <span class="field-label">שם הדייר:</span>
            <span>${member?.full_name || ''}</span>
          </div>
          <div class="field">
            <span class="field-label">דירה:</span>
            <span>${member?.apartment_number || ''}</span>
          </div>
          <div class="field">
            <span class="field-label">עבור חודש:</span>
            <span>${monthName}</span>
          </div>
          <div class="field">
            <span class="field-label">תאריך תשלום:</span>
            <span>${paidDate}</span>
          </div>
          <div class="field">
            <span class="field-label">אמצעי תשלום:</span>
            <span>${payment.payment_method === 'standing_order' ? 'הוראת קבע' : 'מזומן'}</span>
          </div>
          <div class="amount">
            סכום ששולם: ₪${Number(payment.amount).toLocaleString()}
          </div>
        </div>
        <div class="footer">
          <p>אישור זה הופק אוטומטית ע"י מערכת ועד בית</p>
          <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL')}</p>
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

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidAmount = payments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const unpaidAmount = totalAmount - paidAmount;

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('payments.title')}</h1>
            <p className="text-muted-foreground">{building?.name}</p>
          </div>
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
        </div>
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
    </div>
  );
}
