'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Wallet, TrendingUp, TrendingDown, Pencil, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Building, BuildingMember } from '@/types/database';

export default function TreasuryPage() {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  // Computed values
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

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
      const buildingData = membership.buildings as Building;
      setBuilding(buildingData);
      const startingBalance = Number(buildingData?.opening_balance || 0);
      setOpeningBalance(startingBalance);

      // Calculate totals from all time
      // Get all payments (income)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, is_paid')
        .eq('building_id', membership.building_id)
        .eq('is_paid', true) as { data: { amount: number; is_paid: boolean }[] | null };

      const income = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      setTotalIncome(income);

      // Get all expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('building_id', membership.building_id) as { data: { amount: number }[] | null };

      const expenseTotal = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
      setTotalExpenses(expenseTotal);

      // Calculate balance including opening balance
      setCurrentBalance(startingBalance + income - expenseTotal);
    }

    setIsLoading(false);
  };

  const handleUpdateBalance = async () => {
    if (!buildingId || !newBalance) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('buildings')
        .update({ opening_balance: parseFloat(newBalance) } as never)
        .eq('id', buildingId);

      if (error) throw error;

      toast.success('היתרה עודכנה בהצלחה');
      setIsDialogOpen(false);
      setNewBalance('');
      loadData();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('שגיאה בעדכון היתרה');
    } finally {
      setIsSaving(false);
    }
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

  const isPositive = currentBalance >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">קופת הבניין</h1>
          <p className="text-muted-foreground">{building?.name}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Pencil className="ml-2 h-4 w-4" />
              עדכן יתרת פתיחה
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>עדכון יתרת פתיחה</DialogTitle>
              <DialogDescription>
                הזן את יתרת הפתיחה של הקופה (לפני תחילת השימוש במערכת)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="balance">יתרת פתיחה (₪)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateBalance} disabled={isSaving || !newBalance}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'עדכן'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Balance Card */}
      <Card className={`border-2 ${isPositive ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            יתרה נוכחית
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl sm:text-5xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            ₪{Math.abs(currentBalance).toLocaleString()}
            {!isPositive && <span className="text-2xl mr-2">(גירעון)</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {isPositive ? 'יתרה חיובית - הקופה במצב תקין' : 'יתרה שלילית - יש לגבות תשלומים או לצמצם הוצאות'}
          </p>
        </CardContent>
      </Card>

      {/* Income/Expense Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              סה"כ הכנסות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              ₪{totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              מכל התשלומים ששולמו
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
              סה"כ הוצאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-red-600">
              ₪{totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              מכל ההוצאות שנרשמו
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">חישוב יתרה</CardTitle>
          <CardDescription>פירוט החישוב של יתרת הקופה</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {openingBalance !== 0 && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">יתרת פתיחה</span>
                <span className={`font-medium ${openingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {openingBalance >= 0 ? '+' : '-'}₪{Math.abs(openingBalance).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">סה"כ הכנסות</span>
              <span className="font-medium text-green-600">+₪{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">סה"כ הוצאות</span>
              <span className="font-medium text-red-600">-₪{totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 text-lg font-bold">
              <span>יתרה</span>
              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                {isPositive ? '' : '-'}₪{Math.abs(currentBalance).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800">טיפים לניהול הקופה</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p>1. עקבו אחרי גביית התשלומים החודשיים מהדיירים</p>
          <p>2. רשמו את כל ההוצאות באופן שוטף</p>
          <p>3. שמרו על יתרה חיובית לטובת הוצאות בלתי צפויות</p>
          <p>4. בדקו את הדוחות באופן חודשי</p>
        </CardContent>
      </Card>
    </div>
  );
}
