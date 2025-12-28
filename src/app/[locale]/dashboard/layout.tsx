import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import type { Profile, BuildingMember, Building } from '@/types/database';

type MemberWithBuilding = BuildingMember & {
  buildings: Building | null;
};

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

  // Get user's building membership
  const { data: membership } = await supabase
    .from('building_members')
    .select('*, buildings(*)')
    .eq('user_id', user.id)
    .single() as { data: MemberWithBuilding | null };

  const userName = profile?.full_name || user.email || 'משתמש';
  const userRole = membership?.role === 'committee' ? 'committee' : 'tenant';
  const buildingName = membership?.buildings?.name;

  // If user is admin, redirect to admin dashboard
  if (profile?.role === 'admin') {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar userRole={userRole} />
      </div>

      {/* Main content */}
      <div className="md:mr-64">
        <Header userName={userName} buildingName={buildingName} userRole={userRole} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
