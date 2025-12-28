import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, AlertTriangle, Receipt } from 'lucide-react';
import type { Building, BuildingMember, Expense } from '@/types/database';

type MemberWithBuilding = BuildingMember & {
  buildings: Building | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get user's building
  const { data: membership } = await supabase
    .from('building_members')
    .select('building_id, buildings(*)')
    .eq('user_id', user?.id || '')
    .single() as { data: MemberWithBuilding | null };

  const buildingId = membership?.building_id;

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

  const cards = [
    {
      title: 'דיירים',
      value: stats.tenants,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'תשלומים שלא שולמו',
      value: stats.unpaidPayments,
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'תקלות פתוחות',
      value: stats.openIssues,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'הוצאות החודש',
      value: `₪${stats.monthlyExpenses.toLocaleString()}`,
      icon: Receipt,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">לוח בקרה</h1>
        <p className="text-muted-foreground">
          {membership?.buildings?.name || 'ברוכים הבאים למערכת ועד בית'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
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
