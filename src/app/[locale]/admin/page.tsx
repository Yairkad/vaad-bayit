'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, Shield, UserCheck, Inbox } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';

interface Stats {
  totalBuildings: number;
  totalUsers: number;
  adminUsers: number;
  usersWithBuilding: number;
  newRequests: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = createClient();

    const [
      { count: totalBuildings },
      { count: totalUsers },
      { count: adminUsers },
      { count: usersWithBuilding },
      { count: newRequests },
    ] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('building_members').select('user_id', { count: 'exact', head: true }).not('user_id', 'is', null),
      supabase.from('contact_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    ]);

    setStats({
      totalBuildings: totalBuildings || 0,
      totalUsers: totalUsers || 0,
      adminUsers: adminUsers || 0,
      usersWithBuilding: usersWithBuilding || 0,
      newRequests: newRequests || 0,
    });
    setIsLoading(false);
  };

  const cards = [
    {
      title: 'סה״כ בניינים',
      value: stats?.totalBuildings || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/admin/buildings',
    },
    {
      title: 'סה״כ משתמשים',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/admin/users',
    },
    {
      title: 'מנהלי מערכת',
      value: stats?.adminUsers || 0,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/admin/users',
    },
    {
      title: 'משויכים לבניין',
      value: stats?.usersWithBuilding || 0,
      icon: UserCheck,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      href: '/admin/buildings',
    },
    {
      title: 'פניות חדשות',
      value: stats?.newRequests || 0,
      icon: Inbox,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/admin/requests',
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">לוח בקרה - מנהל מערכת</h1>
        <p className="text-sm sm:text-base text-muted-foreground">ניהול כללי של המערכת</p>
      </div>

      {/* Stats Grid - Compact on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        {cards.map((card, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(card.href)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
                <div className={`p-1.5 sm:p-2 rounded-lg ${card.bgColor} shrink-0`}>
                  <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1 sm:w-full">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p className="text-lg sm:text-2xl font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
