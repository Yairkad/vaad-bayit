import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CheckCircle, Clock } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get stats
  const { count: totalBuildings } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true });

  const { count: approvedBuildings } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true);

  const { count: pendingBuildings } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', false);

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const cards = [
    {
      title: 'סה״כ בניינים',
      value: totalBuildings || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'בניינים מאושרים',
      value: approvedBuildings || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'ממתינים לאישור',
      value: pendingBuildings || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'משתמשים רשומים',
      value: totalUsers || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">לוח בקרה - מנהל מערכת</h1>
        <p className="text-muted-foreground">ניהול כללי של המערכת</p>
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
    </div>
  );
}
