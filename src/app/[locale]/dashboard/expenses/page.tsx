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
import { Plus, Pencil, Trash2, Loader2, Repeat, Calendar, Download } from 'lucide-react';
import type { Expense, Building, BuildingMember, ExpenseRecurrence } from '@/types/database';

const CATEGORIES = [
  { value: 'maintenance', label: 'תחזוקה' },
  { value: 'cleaning', label: 'ניקיון' },
  { value: 'electricity', label: 'חשמל' },
  { value: 'water', label: 'מים' },
  { value: 'elevator', label: 'מעלית' },
  { value: 'garden', label: 'גינון' },
  { value: 'insurance', label: 'ביטוח' },
  { value: 'other', label: 'אחר' },
];

const RECURRENCE_OPTIONS = [
  { value: 'one_time', label: 'חד פעמי' },
  { value: 'monthly', label: 'קבוע חודשי' },
  { value: 'bi_monthly', label: 'דו-חודשי' },
];

export default function ExpensesPage() {
  const t = useTranslations();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [formData, setFormData] = useState({
    amount: '',
    category: 'maintenance',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    recurrence: 'one_time' as ExpenseRecurrence,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (buildingId) {
      loadExpenses();
    }
  }, [buildingId, selectedMonth]);

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
    }

    setIsLoading(false);
  };

  const loadExpenses = async () => {
    if (!buildingId) return;

    const supabase = createClient();
    const monthStart = `${selectedMonth}-01`;
    const selectedMonthDate = new Date(selectedMonth + '-01');
    const nextMonth = new Date(selectedMonth + '-01');
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    // Load expenses for this month (one-time expenses in date range)
    const { data: monthlyExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('building_id', buildingId)
      .eq('recurrence', 'one_time')
      .gte('expense_date', monthStart)
      .lt('expense_date', monthEnd)
      .order('expense_date', { ascending: false });

    // Load recurring monthly expenses (started before or in this month, and still active)
    const { data: recurringExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('building_id', buildingId)
      .eq('recurrence', 'monthly')
      .neq('is_active', false)
      .lte('expense_date', monthEnd)
      .order('expense_date', { ascending: false });

    // Load bi-monthly expenses
    const { data: biMonthlyExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('building_id', buildingId)
      .eq('recurrence', 'bi_monthly')
      .neq('is_active', false)
      .lte('expense_date', monthEnd)
      .order('expense_date', { ascending: false });

    // Filter bi-monthly expenses to show only in applicable months
    const filteredBiMonthly = ((biMonthlyExpenses || []) as Expense[]).filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      const monthsDiff = (selectedMonthDate.getFullYear() - expenseDate.getFullYear()) * 12 +
                         (selectedMonthDate.getMonth() - expenseDate.getMonth());
      return monthsDiff >= 0 && monthsDiff % 2 === 0; // Show every other month starting from expense date
    });

    setExpenses([...((monthlyExpenses || []) as Expense[]), ...((recurringExpenses || []) as Expense[]), ...filteredBiMonthly]);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: 'maintenance',
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
      recurrence: 'one_time' as ExpenseRecurrence,
    });
    setEditingExpense(null);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: String(expense.amount),
      category: expense.category,
      description: expense.description || '',
      expense_date: expense.expense_date,
      recurrence: expense.recurrence || 'one_time',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            amount: Number(formData.amount),
            category: formData.category,
            description: formData.description || null,
            expense_date: formData.expense_date,
            recurrence: formData.recurrence,
          } as never)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('ההוצאה עודכנה');
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert({
            building_id: buildingId,
            amount: Number(formData.amount),
            category: formData.category,
            description: formData.description || null,
            expense_date: formData.expense_date,
            recurrence: formData.recurrence,
            created_by: user?.id,
          } as never);

        if (error) throw error;
        toast.success('ההוצאה נוספה');
      }

      setIsDialogOpen(false);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error(error);
      toast.error('אירעה שגיאה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm('האם למחוק את ההוצאה?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expense.id);

    if (error) {
      toast.error('שגיאה במחיקה');
      return;
    }

    toast.success('ההוצאה נמחקה');
    loadExpenses();
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -12; i <= 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getRecurrenceLabel = (value: string) => {
    return RECURRENCE_OPTIONS.find(r => r.value === value)?.label || value;
  };

  // Get effective amount for display (bi-monthly expenses show half)
  const getEffectiveAmount = (expense: Expense) => {
    if (expense.recurrence === 'bi_monthly') {
      return Number(expense.amount) / 2;
    }
    return Number(expense.amount);
  };

  const exportToExcel = () => {
    // Create CSV content (Excel compatible)
    const headers = ['תאריך', 'קטגוריה', 'תיאור', 'סוג', 'סכום'];
    const rows = expenses.map(expense => [
      new Date(expense.expense_date).toLocaleDateString('he-IL'),
      getCategoryLabel(expense.category),
      expense.description || '',
      getRecurrenceLabel(expense.recurrence || 'one_time'),
      getEffectiveAmount(expense).toString()
    ]);

    // Add BOM for Hebrew support in Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    link.download = `הוצאות_${monthLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('הקובץ יורד בהצלחה');
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + getEffectiveAmount(e), 0);

  // Group by category
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + getEffectiveAmount(e);
    return acc;
  }, {} as Record<string, number>);

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
          <h1 className="text-3xl font-bold">{t('expenses.title')}</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <div className="flex gap-4 items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
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
          <Button variant="outline" onClick={exportToExcel} disabled={expenses.length === 0}>
            <Download className="ml-2 h-4 w-4" />
            ייצוא
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                {t('expenses.addExpense')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? 'עריכת הוצאה' : t('expenses.addExpense')}
                </DialogTitle>
                <DialogDescription>
                  הוספת הוצאה חדשה לבניין
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">{t('common.amount')} (₪) *</Label>
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
                      <Label>{t('expenses.category')} *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense_date">{t('common.date')} *</Label>
                      <Input
                        id="expense_date"
                        type="date"
                        value={formData.expense_date}
                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סוג הוצאה</Label>
                      <Select
                        value={formData.recurrence}
                        onValueChange={(value: ExpenseRecurrence) => setFormData({ ...formData, recurrence: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('common.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">סה״כ הוצאות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>
        {Object.entries(byCategory).slice(0, 3).map(([cat, amount]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{getCategoryLabel(cat)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₪{amount.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">רשימת הוצאות</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('expenses.category')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {new Date(expense.expense_date).toLocaleDateString('he-IL')}
                      {expense.recurrence === 'monthly' && (
                        <span title="קבוע חודשי">
                          <Repeat className="h-3 w-3 text-blue-500" />
                        </span>
                      )}
                      {expense.recurrence === 'bi_monthly' && (
                        <span title="דו-חודשי">
                          <Calendar className="h-3 w-3 text-purple-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                      {expense.recurrence !== 'one_time' && (
                        <Badge variant="secondary" className="text-xs">
                          {getRecurrenceLabel(expense.recurrence)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      ₪{getEffectiveAmount(expense).toLocaleString()}
                      {expense.recurrence === 'bi_monthly' && (
                        <span className="text-xs text-muted-foreground block">
                          (מתוך ₪{Number(expense.amount).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    אין הוצאות לחודש זה
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
