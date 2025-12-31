import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BuildingProvider } from '@/contexts/BuildingContext';
import type { Profile, BuildingMember, Building } from '@/types/database';

interface BuildingWithMembership extends Building {
  membership: BuildingMember;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null };

  // If user is admin, redirect to admin dashboard
  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  // Get ALL committee memberships for this user
  const { data: memberships } = await supabase
    .from('building_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('role', 'committee') as { data: BuildingMember[] | null };

  // If user has no committee memberships, check if they're a tenant
  if (!memberships || memberships.length === 0) {
    // Check for tenant membership
    const { data: tenantMembership } = await supabase
      .from('building_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'tenant')
      .single();

    if (tenantMembership) {
      redirect('/tenant');
    }
    // No membership at all - this shouldn't happen normally
    redirect('/login');
  }

  // Get all buildings for these memberships
  const buildingIds = memberships.map(m => m.building_id);
  const { data: buildings } = await supabase
    .from('buildings')
    .select('*')
    .in('id', buildingIds) as { data: Building[] | null };

  // Combine buildings with their memberships
  const buildingsWithMembership: BuildingWithMembership[] = (buildings || []).map(building => {
    const membership = memberships.find(m => m.building_id === building.id)!;
    return { ...building, membership };
  });

  const userName = profile?.full_name || user.email || 'משתמש';

  return (
    <BuildingProvider
      initialBuildings={buildingsWithMembership}
      initialBuildingId={buildingsWithMembership[0]?.id}
    >
      <div className="min-h-screen bg-gradient-main">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar userRole="committee" />
        </div>

        {/* Main content */}
        <div className="md:mr-64">
          <Header userName={userName} userRole="committee" />
          <main id="main-content" className="p-6">
            {children}
          </main>
        </div>
      </div>
    </BuildingProvider>
  );
}
