import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { Building, Expense } from '@/types/database';
import { StatCard, type StatCardVariant, type StatCardIcon } from '@/components/ui/stat-card';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get user's building membership (separate queries to avoid 406)
  const { data: membership } = await supabase
    .from('building_members')
    .select('building_id')
    .eq('user_id', user?.id || '')
    .single() as { data: { building_id: string } | null };

  const buildingId = membership?.building_id;

  // Get building details separately
  let building: Building | null = null;
  if (buildingId) {
    const { data: buildingData } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single() as { data: Building | null };
    building = buildingData;
  }

  // Get stats if building exists
  let stats = {
    tenants: 0,
    unpaidPayments: 0,
    openIssues: 0,
    monthlyExpenses: 0,
  };

  if (buildingId) {
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

    stats = {
      tenants: tenantsCount || 0,
      unpaidPayments: unpaidCount || 0,
      openIssues: issuesCount || 0,
      monthlyExpenses,
    };
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">לוח בקרה</h1>
        <p className="text-muted-foreground">
          {building?.name || 'ברוכים הבאים למערכת ועד בית'}
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
      {!buildingId && (
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
