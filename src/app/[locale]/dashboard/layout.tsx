import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import type { Profile, BuildingMember, Building } from '@/types/database';

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

  // Get user's building membership (separate queries to avoid 406)
  const { data: membership } = await supabase
    .from('building_members')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: BuildingMember | null };

  // Get building details separately
  let building: Building | null = null;
  if (membership?.building_id) {
    const { data: buildingData } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', membership.building_id)
      .single() as { data: Building | null };
    building = buildingData;
  }

  const userName = profile?.full_name || user.email || 'משתמש';
  const userRole = membership?.role === 'committee' ? 'committee' : 'tenant';
  const buildingName = building?.name;

  // If user is admin, redirect to admin dashboard
  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  // If user is not committee, redirect to tenant area
  if (membership?.role !== 'committee') {
    redirect('/tenant');
  }

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar userRole={userRole} />
      </div>

      {/* Main content */}
      <div className="md:mr-64">
        <Header userName={userName} buildingName={buildingName} userRole={userRole} />
        <main id="main-content" className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
