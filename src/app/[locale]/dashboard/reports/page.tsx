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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, TrendingUp, TrendingDown, Users, AlertTriangle, ChevronLeft, Download } from 'lucide-react';
import type { Payment, Expense, BuildingMember, Building } from '@/types/database';

type PaymentWithMember = Payment & { building_members: BuildingMember };

// Hebrew category labels
const CATEGORY_LABELS: Record<string, string> = {
  maintenance: 'תחזוקה',
  cleaning: 'ניקיון',
  electricity: 'חשמל',
  water: 'מים',
  elevator: 'מעלית',
  garden: 'גינון',
  insurance: 'ביטוח',
  other: 'אחר',
};

const getCategoryLabel = (category: string) => CATEGORY_LABELS[category] || category;

export default function ReportsPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [members, setMembers] = useState<BuildingMember[]>([]);
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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
      monthIndex: i,
      month: new Date(parseInt(selectedYear), i, 1).toLocaleDateString('he-IL', { month: 'short' }),
      monthFull: new Date(parseInt(selectedYear), i, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
      expected: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      paid: monthPayments.filter(p => p.is_paid).reduce((sum, p) => sum + Number(p.amount), 0),
      expenses: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
      payments: monthPayments,
      expensesList: monthExpenses,
    };
  });

  // Get data for selected month
  const getSelectedMonthData = () => {
    if (selectedMonth === null) return null;
    return monthlyData[selectedMonth];
  };

  const selectedMonthData = getSelectedMonthData();

  const exportToExcel = () => {
    // Create CSV content with BOM for Hebrew Excel support
    const BOM = '\uFEFF';

    // Summary section
    let csvContent = 'דוח שנתי - ' + selectedYear + '\n';
    csvContent += building?.name + '\n\n';
    csvContent += 'סיכום שנתי\n';
    csvContent += 'סה״כ הכנסות צפויות,₪' + totalExpected.toLocaleString() + '\n';
    csvContent += 'שולם בפועל,₪' + totalPaid.toLocaleString() + '\n';
    csvContent += 'לא שולם,₪' + totalUnpaid.toLocaleString() + '\n';
    csvContent += 'סה״כ הוצאות,₪' + totalExpenses.toLocaleString() + '\n';
    csvContent += 'מאזן,₪' + balance.toLocaleString() + '\n\n';

    // Monthly breakdown
    csvContent += 'פירוט חודשי\n';
    csvContent += 'חודש,הכנסות צפויות,שולם,הוצאות,מאזן\n';
    monthlyData.forEach(data => {
      csvContent += `${data.month},₪${data.expected.toLocaleString()},₪${data.paid.toLocaleString()},₪${data.expenses.toLocaleString()},₪${(data.paid - data.expenses).toLocaleString()}\n`;
    });
    csvContent += '\n';

    // Expense breakdown by category
    csvContent += 'פירוט הוצאות לפי קטגוריה\n';
    csvContent += 'קטגוריה,סכום\n';
    Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, amount]) => {
        csvContent += `${getCategoryLabel(category)},₪${amount.toLocaleString()}\n`;
      });
    csvContent += '\n';

    // Debtors list
    if (debtors.length > 0) {
      csvContent += 'רשימת חייבים\n';
      csvContent += 'דירה,שם,חודשים לא שולמו,סכום חוב\n';
      debtors.forEach(({ member, unpaidCount, unpaidAmount }) => {
        csvContent += `${member.apartment_number},${member.full_name},${unpaidCount},₪${unpaidAmount.toLocaleString()}\n`;
      });
    }

    // Download the file
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `דוח_שנתי_${selectedYear}_${building?.name || 'בניין'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <p className="text-muted-foreground">אין לך הרשאות ניהול</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(224, 231, 255, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('nav.reports')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full sm:w-32">
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פירוט חודשי</CardTitle>
            <CardDescription>לחץ על חודש לצפייה בפירוט מלא</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {monthlyData.map((data, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm border-b pb-2 hover:bg-muted/50 cursor-pointer rounded px-2 py-1 -mx-2 transition-colors"
                  onClick={() => setSelectedMonth(data.monthIndex)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-16">{data.month}</span>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
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
                      <span className="text-sm">{getCategoryLabel(category)}</span>
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

      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button variant="outline" onClick={exportToExcel} className="w-full sm:w-auto">
          <Download className="ml-2 h-4 w-4" />
          ייצא לאקסל
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
          <FileText className="ml-2 h-4 w-4" />
          הדפס דוח
        </Button>
      </div>

      {/* Month Detail Dialog */}
      <Dialog open={selectedMonth !== null} onOpenChange={(open) => !open && setSelectedMonth(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              פירוט {selectedMonthData?.monthFull}
            </DialogTitle>
            <DialogDescription>
              הכנסות והוצאות מפורטות לחודש זה
            </DialogDescription>
          </DialogHeader>

          {selectedMonthData && (
            <div className="space-y-6 py-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">הכנסות</p>
                    <p className="text-2xl font-bold text-green-600">₪{selectedMonthData.paid.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">מתוך ₪{selectedMonthData.expected.toLocaleString()} צפוי</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">הוצאות</p>
                    <p className="text-2xl font-bold text-red-600">₪{selectedMonthData.expenses.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">מאזן</p>
                    <p className={`text-2xl font-bold ${selectedMonthData.paid - selectedMonthData.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₪{(selectedMonthData.paid - selectedMonthData.expenses).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Payments Table */}
              <div>
                <h3 className="font-semibold mb-3">תשלומי דיירים</h3>
                {selectedMonthData.payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>דירה</TableHead>
                        <TableHead>שם</TableHead>
                        <TableHead>סכום</TableHead>
                        <TableHead>סטטוס</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMonthData.payments
                        .sort((a, b) => (a.building_members?.apartment_number || '').localeCompare(b.building_members?.apartment_number || '', 'he', { numeric: true }))
                        .map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.building_members?.apartment_number}</TableCell>
                            <TableCell>{payment.building_members?.full_name}</TableCell>
                            <TableCell>₪{Number(payment.amount).toLocaleString()}</TableCell>
                            <TableCell>
                              {payment.is_paid ? (
                                <Badge className="bg-green-600">שולם</Badge>
                              ) : (
                                <Badge variant="destructive">לא שולם</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">אין תשלומים בחודש זה</p>
                )}
              </div>

              {/* Expenses Table */}
              <div>
                <h3 className="font-semibold mb-3">הוצאות</h3>
                {selectedMonthData.expensesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>תאריך</TableHead>
                        <TableHead>קטגוריה</TableHead>
                        <TableHead>תיאור</TableHead>
                        <TableHead>סכום</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMonthData.expensesList
                        .sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime())
                        .map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.expense_date).toLocaleDateString('he-IL')}</TableCell>
                            <TableCell>{getCategoryLabel(expense.category)}</TableCell>
                            <TableCell>{expense.description || '-'}</TableCell>
                            <TableCell className="text-red-600">₪{Number(expense.amount).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">אין הוצאות בחודש זה</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
