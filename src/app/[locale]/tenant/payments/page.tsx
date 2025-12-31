'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Calendar, AlertCircle, CircleDollarSign } from 'lucide-react';

interface Payment {
  id: string;
  month: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface ExtraCharge {
  id: string;
  amount: number;
  reason: string;
  charge_date: string;
  is_paid: boolean;
  paid_at: string | null;
}

interface MemberInfo {
  payment_method: string;
  standing_order_active: boolean;
  payment_day: number | null;
  monthly_amount: number | null;
}

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get membership with payment info
    const { data: membership } = await supabase
      .from('building_members')
      .select('id, payment_method, standing_order_active, payment_day, monthly_amount')
      .eq('user_id', user.id)
      .single() as { data: (MemberInfo & { id: string }) | null };

    if (!membership) {
      setIsLoading(false);
      return;
    }

    setMemberInfo({
      payment_method: membership.payment_method,
      standing_order_active: membership.standing_order_active,
      payment_day: membership.payment_day,
      monthly_amount: membership.monthly_amount,
    });

    // Get payments
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', membership.id)
      .order('month', { ascending: false }) as { data: Payment[] | null };

    setPayments(data || []);

    // Get extra charges
    const { data: chargesData } = await supabase
      .from('extra_charges')
      .select('*')
      .eq('member_id', membership.id)
      .order('charge_date', { ascending: false }) as { data: ExtraCharge[] | null };

    setExtraCharges(chargesData || []);
    setIsLoading(false);
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const formatShortMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
  };

  const totalPaymentsDue = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExtraChargesDue = extraCharges.filter(c => !c.is_paid).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalDue = totalPaymentsDue + totalExtraChargesDue;

  // Get next payment info
  const getNextPaymentInfo = () => {
    // Find the next unpaid payment
    const unpaidPayments = payments.filter(p => !p.is_paid).sort((a, b) =>
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );

    if (unpaidPayments.length > 0) {
      return {
        month: formatMonth(unpaidPayments[0].month),
        amount: unpaidPayments[0].amount,
        isOverdue: new Date(unpaidPayments[0].month) < new Date(),
      };
    }

    // If all paid, show next expected payment based on standing order
    if (memberInfo?.standing_order_active && memberInfo.payment_day && memberInfo.monthly_amount) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      let nextMonth = new Date(currentYear, currentMonth + 1, 1);

      return {
        month: nextMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
        amount: memberInfo.monthly_amount,
        chargeDate: memberInfo.payment_day,
        isStandingOrder: true,
      };
    }

    return null;
  };

  const nextPayment = getNextPaymentInfo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" style={{ background: 'linear-gradient(135deg, rgba(254, 249, 195, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">התשלומים שלי</h1>
        <p className="text-sm sm:text-base text-muted-foreground">צפייה בהיסטוריית התשלומים</p>
      </div>

      {/* Next Payment Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {nextPayment ? (
            <div className="space-y-4">
              {/* Next Payment Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${nextPayment.isOverdue ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                    <Calendar className={`h-5 w-5 ${nextPayment.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {nextPayment.isOverdue ? 'תשלום באיחור' : 'התשלום הבא'}
                    </p>
                    <p className="font-semibold">{nextPayment.month}</p>
                    {nextPayment.isStandingOrder && nextPayment.chargeDate && (
                      <p className="text-xs text-muted-foreground">
                        יחויב בתאריך {nextPayment.chargeDate} לחודש (הו״ק)
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold">₪{Number(nextPayment.amount).toLocaleString()}</p>
                </div>
              </div>

              {/* Debt Warning */}
              {totalDue > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 rounded-b-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">יתרת חוב</span>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">₪{totalDue.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-700 dark:text-green-400">כל התשלומים שולמו!</p>
              <p className="text-sm text-muted-foreground">אין תשלומים ממתינים</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extra Charges Card */}
      {extraCharges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" />
              חיובים נוספים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {extraCharges.map((charge) => (
                <div
                  key={charge.id}
                  className={`p-4 flex items-center justify-between ${!charge.is_paid ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{charge.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(charge.charge_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="text-left space-y-1">
                    <p className="font-bold">₪{Number(charge.amount).toLocaleString()}</p>
                    <Badge variant={charge.is_paid ? 'default' : 'secondary'}>
                      {charge.is_paid ? 'שולם' : 'ממתין'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">היסטוריית תשלומים חודשיים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              אין תשלומים להצגה
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right px-4 py-2 font-medium">חודש</th>
                    <th className="text-right px-4 py-2 font-medium">סכום</th>
                    <th className="text-center px-4 py-2 font-medium">סטטוס</th>
                    <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">תאריך תשלום</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment.id} className={!payment.is_paid ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                      <td className="px-4 py-3">
                        <span className="hidden sm:inline">{formatMonth(payment.month)}</span>
                        <span className="sm:hidden">{formatShortMonth(payment.month)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">₪{Number(payment.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {payment.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">שולם</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">לתשלום</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString('he-IL')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
