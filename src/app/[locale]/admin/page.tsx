'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Users, UserCheck, UserX, Inbox, Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { StatCard, type StatCardVariant } from '@/components/ui/stat-card';

interface Stats {
  totalBuildings: number;
  totalUsers: number;
  committeeUsers: number;
  usersWithoutBuilding: number;
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
      { data: allProfiles },
      { count: committeeUsers },
      { data: usersWithBuilding },
      { count: newRequests },
    ] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, role'),
      supabase.from('building_members').select('*', { count: 'exact', head: true }).eq('role', 'committee'),
      supabase.from('building_members').select('user_id').not('user_id', 'is', null),
      supabase.from('contact_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    ]);

    // Get profiles data
    const profiles = (allProfiles || []) as { id: string; role: string }[];
    const totalUsers = profiles.length;

    // Calculate users without building assignment (excluding admins)
    const assignedUserIds = new Set((usersWithBuilding as { user_id: string }[] || []).map(m => m.user_id));
    const nonAdminProfiles = profiles.filter(p => p.role !== 'admin');
    const usersWithoutBuilding = nonAdminProfiles.filter(p => !assignedUserIds.has(p.id)).length;

    setStats({
      totalBuildings: totalBuildings || 0,
      totalUsers: totalUsers,
      committeeUsers: committeeUsers || 0,
      usersWithoutBuilding: usersWithoutBuilding,
      newRequests: newRequests || 0,
    });
    setIsLoading(false);
  };

  const cards: {
    title: string;
    value: number;
    icon: typeof Building2;
    variant: StatCardVariant;
    href: string;
  }[] = [
    {
      title: 'סה״כ בניינים',
      value: stats?.totalBuildings || 0,
      icon: Building2,
      variant: 'blue',
      href: '/admin/buildings',
    },
    {
      title: 'סה״כ משתמשים',
      value: stats?.totalUsers || 0,
      icon: Users,
      variant: 'purple',
      href: '/admin/users',
    },
    {
      title: 'מנהלי בניין / ועד',
      value: stats?.committeeUsers || 0,
      icon: UserCheck,
      variant: 'teal',
      href: '/admin/users',
    },
    {
      title: 'לא משויכים',
      value: stats?.usersWithoutBuilding || 0,
      icon: UserX,
      variant: 'red',
      href: '/admin/users',
    },
    {
      title: 'פניות חדשות',
      value: stats?.newRequests || 0,
      icon: Inbox,
      variant: 'orange',
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
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            variant={card.variant}
            onClick={() => router.push(card.href)}
          />
        ))}
      </div>
    </div>
  );
}
