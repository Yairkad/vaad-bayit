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
import { Plus, Pencil, Trash2, Loader2, Repeat, Calendar, Download, Upload, FileText, Users, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<BuildingMember[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
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
    shared_buildings_count: '1',
    is_partial: false,
    selected_members: [] as string[],
    receipt_file: null as string | null,
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

      // Load building members for partial expense selection
      const { data: membersData } = await supabase
        .from('building_members')
        .select('*')
        .eq('building_id', membership.building_id)
        .order('apartment_number');

      if (membersData) {
        setMembers(membersData as BuildingMember[]);
      }
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
      shared_buildings_count: '1',
      is_partial: false,
      selected_members: [],
      receipt_file: null,
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
      shared_buildings_count: String(expense.shared_buildings_count || 1),
      is_partial: false, // We don't track this per expense yet
      selected_members: [],
      receipt_file: expense.receipt_file || null,
    });
    setIsDialogOpen(true);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !buildingId) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 5MB');
      return;
    }

    setIsUploadingReceipt(true);
    const supabase = createClient();

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${buildingId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
          toast.error('יש ליצור bucket בשם receipts ב-Supabase Storage');
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      setFormData({ ...formData, receipt_file: publicUrl });
      toast.success('החשבונית הועלתה בהצלחה');
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בהעלאת החשבונית');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;

    setIsSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const sharedCount = parseInt(formData.shared_buildings_count) || 1;
      const totalAmount = Number(formData.amount);
      const buildingAmount = sharedCount > 1 ? totalAmount / sharedCount : totalAmount;

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            amount: buildingAmount,
            category: formData.category,
            description: formData.description || null,
            expense_date: formData.expense_date,
            recurrence: formData.recurrence,
            shared_buildings_count: sharedCount,
            original_amount: sharedCount > 1 ? totalAmount : null,
            receipt_file: formData.receipt_file,
          } as never)
          .eq('id', editingExpense.id);

        if (error) throw error;
        toast.success('ההוצאה עודכנה');
      } else {
        // Insert the expense
        const { data: newExpense, error } = await supabase
          .from('expenses')
          .insert({
            building_id: buildingId,
            amount: buildingAmount,
            category: formData.category,
            description: formData.description || null,
            expense_date: formData.expense_date,
            recurrence: formData.recurrence,
            shared_buildings_count: sharedCount,
            original_amount: sharedCount > 1 ? totalAmount : null,
            receipt_file: formData.receipt_file,
            created_by: user?.id,
          } as never)
          .select()
          .single();

        if (error) throw error;

        // If partial expense with selected members, create extra charges
        if (formData.is_partial && formData.selected_members.length > 0) {
          const chargeAmount = totalAmount / formData.selected_members.length;
          const charges = formData.selected_members.map(memberId => ({
            building_id: buildingId,
            member_id: memberId,
            expense_id: (newExpense as Expense).id,
            amount: chargeAmount,
            reason: formData.description || getCategoryLabel(formData.category),
            charge_date: formData.expense_date,
            created_by: user?.id,
          }));

          const { error: chargesError } = await supabase
            .from('extra_charges')
            .insert(charges as never);

          if (chargesError) {
            console.error('Error creating charges:', chargesError);
            toast.warning('ההוצאה נוספה אך היתה שגיאה ביצירת החיובים');
          } else {
            toast.success(`ההוצאה נוספה ונוצרו ${formData.selected_members.length} חיובים`);
          }
        } else {
          toast.success('ההוצאה נוספה');
        }
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
    const confirmed = await confirm({
      title: 'מחיקת הוצאה',
      description: 'האם למחוק את ההוצאה?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

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
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(255, 228, 230, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('expenses.title')}</h1>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel} disabled={expenses.length === 0} className="flex-1 sm:flex-none">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {/* Shared between buildings */}
                  <div className="space-y-2 border-t pt-4">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      הוצאה משותפת בין בניינים
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">מספר בניינים:</span>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        className="w-20"
                        value={formData.shared_buildings_count}
                        onChange={(e) => setFormData({ ...formData, shared_buildings_count: e.target.value })}
                      />
                    </div>
                    {parseInt(formData.shared_buildings_count) > 1 && formData.amount && (
                      <p className="text-sm text-muted-foreground">
                        חלק הבניין: ₪{(Number(formData.amount) / parseInt(formData.shared_buildings_count)).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Partial expense - specific apartments */}
                  {!editingExpense && (
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="is_partial"
                          checked={formData.is_partial}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_partial: !!checked, selected_members: [] })}
                        />
                        <Label htmlFor="is_partial" className="flex items-center gap-2 cursor-pointer">
                          <Users className="h-4 w-4" />
                          חיוב לדירות ספציפיות בלבד
                        </Label>
                      </div>

                      {formData.is_partial && (
                        <div className="space-y-2 pr-6">
                          <p className="text-sm text-muted-foreground">בחר את הדירות שישתתפו בהוצאה:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                            {members.map(member => (
                              <div key={member.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`member-${member.id}`}
                                  checked={formData.selected_members.includes(member.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData({ ...formData, selected_members: [...formData.selected_members, member.id] });
                                    } else {
                                      setFormData({ ...formData, selected_members: formData.selected_members.filter(id => id !== member.id) });
                                    }
                                  }}
                                />
                                <Label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer">
                                  דירה {member.apartment_number}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {formData.selected_members.length > 0 && formData.amount && (
                            <p className="text-sm text-muted-foreground">
                              חיוב לכל דירה: ₪{(Number(formData.amount) / formData.selected_members.length).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Receipt upload */}
                  <div className="space-y-2 border-t pt-4">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      חשבונית / קבלה
                    </Label>
                    {formData.receipt_file ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={formData.receipt_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          צפה בחשבונית
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, receipt_file: null })}
                        >
                          הסר
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleReceiptUpload}
                          className="hidden"
                          id="receipt-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('receipt-upload')?.click()}
                          disabled={isUploadingReceipt}
                        >
                          {isUploadingReceipt ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <Upload className="h-4 w-4 ml-2" />
                          )}
                          העלה חשבונית
                        </Button>
                      </div>
                    )}
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
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {expenses.map((expense) => (
          <Card key={expense.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                    {expense.recurrence !== 'one_time' && (
                      <Badge variant="secondary" className="text-xs">
                        {getRecurrenceLabel(expense.recurrence)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg font-bold">₪{getEffectiveAmount(expense).toLocaleString()}</p>
                  {expense.description && (
                    <p className="text-sm text-muted-foreground">{expense.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {new Date(expense.expense_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(expense)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(expense)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {expenses.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              אין הוצאות לחודש זה
            </CardContent>
          </Card>
        )}
      </div>

      {/* Expenses Table - Desktop */}
      <Card className="hidden md:block">
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
