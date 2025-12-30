'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, CreditCard, CalendarClock } from 'lucide-react';

interface Payment {
  id: string;
  month: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface MemberInfo {
  payment_method: string;
  standing_order_active: boolean;
  payment_day: number | null;
  monthly_amount: number | null;
}

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
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
    setIsLoading(false);
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const totalDue = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = payments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);

  // Get next standing order charge info
  const getStandingOrderInfo = () => {
    if (!memberInfo || memberInfo.payment_method !== 'standing_order' || !memberInfo.standing_order_active || !memberInfo.payment_day) {
      return null;
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const paymentDay = memberInfo.payment_day;

    let chargeDate = new Date(currentYear, currentMonth, paymentDay);

    // If the payment day has passed this month, show next month
    if (today.getDate() > paymentDay) {
      chargeDate = new Date(currentYear, currentMonth + 1, paymentDay);
    }

    const isPast = today > chargeDate;
    const formattedDate = chargeDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

    return {
      date: formattedDate,
      amount: memberInfo.monthly_amount,
      isPast,
    };
  };

  const standingOrderInfo = getStandingOrderInfo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">התשלומים שלי</h1>
        <p className="text-sm sm:text-base text-muted-foreground">צפייה בהיסטוריית התשלומים</p>
      </div>

      {/* Standing Order Info */}
      {standingOrderInfo && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {standingOrderInfo.isPast ? 'חויב' : 'יחויב'} בתאריך {standingOrderInfo.date}
                </p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                  הו״ק בסכום ₪{standingOrderInfo.amount?.toLocaleString() || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">לתשלום</p>
            <p className="text-2xl font-bold text-red-600">₪{totalDue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">שולם</p>
            <p className="text-2xl font-bold text-green-600">₪{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">היסטוריית תשלומים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              אין תשלומים להצגה
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {payment.is_paid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{formatMonth(payment.month)}</p>
                      {payment.paid_at && (
                        <p className="text-xs text-muted-foreground">
                          שולם ב-{new Date(payment.paid_at).toLocaleDateString('he-IL')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">₪{Number(payment.amount).toLocaleString()}</p>
                    <Badge variant={payment.is_paid ? 'default' : 'destructive'} className="text-xs">
                      {payment.is_paid ? 'שולם' : 'לתשלום'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
