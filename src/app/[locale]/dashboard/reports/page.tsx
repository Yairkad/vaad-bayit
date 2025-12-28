'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react';
import type { Payment, Expense, BuildingMember, Building } from '@/types/database';

type PaymentWithMember = Payment & { building_members: BuildingMember };

export default function ReportsPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [members, setMembers] = useState<BuildingMember[]>([]);
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (buildingId) {
      loadYearData();
    }
  }, [buildingId, selectedYear]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

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

      const { data: membersData } = await supabase
        .from('building_members')
        .select('*')
        .eq('building_id', membership.building_id);

      setMembers(membersData || []);
    }

    setIsLoading(false);
  };

  const loadYearData = async () => {
    if (!buildingId) return;

    const supabase = createClient();
    const yearStart = `${selectedYear}-01-01`;
    const yearEnd = `${selectedYear}-12-31`;

    const [paymentsRes, expensesRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, building_members(*)')
        .eq('building_id', buildingId)
        .gte('month', yearStart)
        .lte('month', yearEnd),
      supabase
        .from('expenses')
        .select('*')
        .eq('building_id', buildingId)
        .gte('expense_date', yearStart)
        .lte('expense_date', yearEnd),
    ]);

    setPayments((paymentsRes.data as PaymentWithMember[]) || []);
    setExpenses(expensesRes.data || []);
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i.toString());
    }
    return years;
  };

  // Calculate statistics
  const totalExpected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = payments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalUnpaid = totalExpected - totalPaid;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = totalPaid - totalExpenses;

  // Get debtors (members with unpaid payments)
  const debtors = members.map(member => {
    const memberPayments = payments.filter(p => p.member_id === member.id);
    const unpaid = memberPayments.filter(p => !p.is_paid);
    const unpaidAmount = unpaid.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      member,
      unpaidCount: unpaid.length,
      unpaidAmount,
    };
  }).filter(d => d.unpaidCount > 0).sort((a, b) => b.unpaidAmount - a.unpaidAmount);

  // Get expense breakdown by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthStr = `${selectedYear}-${String(month).padStart(2, '0')}`;
    const monthPayments = payments.filter(p => p.month.startsWith(monthStr));
    const monthExpenses = expenses.filter(e => e.expense_date.startsWith(monthStr));

    return {
      month: new Date(parseInt(selectedYear), i, 1).toLocaleDateString('he-IL', { month: 'short' }),
      expected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      paid: monthPayments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0),
      expenses: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    };
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
          <p className="text-muted-foreground">אין לך הרשאות ניהול</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.reports')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getYearOptions().map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              סה״כ הכנסות צפויות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{totalExpected.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              שולם בפועל
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₪{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              סה״כ הוצאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₪{totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              מאזן
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₪{balance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פירוט חודשי</CardTitle>
            <CardDescription>הכנסות והוצאות לפי חודש</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.map((data, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-2">
                  <span className="font-medium w-16">{data.month}</span>
                  <div className="flex gap-4">
                    <span className="text-green-600">+₪{data.paid.toLocaleString()}</span>
                    <span className="text-red-600">-₪{data.expenses.toLocaleString()}</span>
                    <span className={`font-medium ${data.paid - data.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₪{(data.paid - data.expenses).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פירוט הוצאות לפי קטגוריה</CardTitle>
            <CardDescription>חלוקת ההוצאות השנתיות</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="font-medium">₪{amount.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">אין הוצאות בשנה זו</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debtors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            רשימת חייבים
          </CardTitle>
          <CardDescription>דיירים עם חובות פתוחים</CardDescription>
        </CardHeader>
        <CardContent>
          {debtors.length > 0 ? (
            <div className="space-y-3">
              {debtors.map(({ member, unpaidCount, unpaidAmount }) => (
                <div key={member.id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">דירה {member.apartment_number}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-red-600">₪{unpaidAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{unpaidCount} חודשים</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              אין חובות פתוחים - כל הדיירים שילמו
            </p>
          )}
        </CardContent>
      </Card>

      {/* Print Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => window.print()}>
          <FileText className="ml-2 h-4 w-4" />
          הדפס דוח
        </Button>
      </div>
    </div>
  );
}
