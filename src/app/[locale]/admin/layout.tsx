import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import type { Profile } from '@/types/database';

export default async function AdminLayout({
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

  // Only admins can access this area
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const userName = profile?.full_name || user.email || 'מנהל';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar userRole="admin" />
      </div>

      {/* Main content */}
      <div className="md:mr-64">
        <Header userName={userName} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
