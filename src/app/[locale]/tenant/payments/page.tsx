'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Payment {
  id: string;
  month: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get membership
    const { data: membership } = await supabase
      .from('building_members')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: { id: string } | null };

    if (!membership) {
      setIsLoading(false);
      return;
    }

    // Get payments
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', membership.id)
      .order('month', { ascending: false });

    setPayments(data || []);
    setIsLoading(false);
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  const totalDue = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = payments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);

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
