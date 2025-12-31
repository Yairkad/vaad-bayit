'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBuilding } from '@/contexts/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { Expense } from '@/types/database';
import { StatCard, type StatCardVariant, type StatCardIcon } from '@/components/ui/stat-card';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { currentBuilding } = useBuilding();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    tenants: 0,
    unpaidPayments: 0,
    openIssues: 0,
    monthlyExpenses: 0,
  });

  useEffect(() => {
    if (currentBuilding?.id) {
      loadStats();
    } else {
      setIsLoading(false);
    }
  }, [currentBuilding?.id]);

  const loadStats = async () => {
    if (!currentBuilding?.id) return;

    setIsLoading(true);
    const supabase = createClient();
    const buildingId = currentBuilding.id;

    // Count tenants
    const { count: tenantsCount } = await supabase
      .from('building_members')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', buildingId);

    // Count unpaid payments
    const { count: unpaidCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', buildingId)
      .eq('is_paid', false);

    // Count open issues
    const { count: issuesCount } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .eq('building_id', buildingId)
      .neq('status', 'closed');

    // Sum monthly expenses
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('building_id', buildingId)
      .gte('expense_date', `${currentMonth}-01`) as { data: Pick<Expense, 'amount'>[] | null };

    const monthlyExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    setStats({
      tenants: tenantsCount || 0,
      unpaidPayments: unpaidCount || 0,
      openIssues: issuesCount || 0,
      monthlyExpenses,
    });

    setIsLoading(false);
  };

  const cards: {
    title: string;
    value: string | number;
    icon: StatCardIcon;
    variant: StatCardVariant;
    href: string;
  }[] = [
    {
      title: 'דיירים',
      value: stats.tenants,
      icon: 'users',
      variant: 'blue',
      href: '/dashboard/tenants',
    },
    {
      title: 'תשלומים שלא שולמו',
      value: stats.unpaidPayments,
      icon: 'credit-card',
      variant: 'red',
      href: '/dashboard/payments',
    },
    {
      title: 'תקלות פתוחות',
      value: stats.openIssues,
      icon: 'alert-triangle',
      variant: 'orange',
      href: '/dashboard/issues',
    },
    {
      title: 'הוצאות החודש',
      value: `₪${stats.monthlyExpenses.toLocaleString()}`,
      icon: 'receipt',
      variant: 'green',
      href: '/dashboard/expenses',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: 'linear-gradient(135deg, rgba(241, 245, 249, 0.6) 0%, rgba(255, 255, 255, 1) 100%)', margin: '-1.5rem', padding: '1.5rem', minHeight: 'calc(100vh - 4rem)' }}>
      <div>
        <h1 className="text-3xl font-bold">לוח בקרה</h1>
        <p className="text-muted-foreground">
          {currentBuilding?.name || 'ברוכים הבאים למערכת ועד בית'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Link key={index} href={card.href}>
            <StatCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              variant={card.variant}
            />
          </Link>
        ))}
      </div>

      {/* Welcome message if no building */}
      {!currentBuilding && (
        <Card>
          <CardHeader>
            <CardTitle>ברוכים הבאים!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              עדיין לא משויכת לבניין. צור קשר עם ועד הבית שלך כדי להצטרף לבניין.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
