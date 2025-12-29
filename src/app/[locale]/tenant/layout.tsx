'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Loader2 } from 'lucide-react';

interface UserData {
  fullName: string;
  buildingName: string | null;
  role: 'admin' | 'committee' | 'tenant';
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    // Get building membership
    const { data: membership } = await supabase
      .from('building_members')
      .select('buildings(name, address)')
      .eq('user_id', user.id)
      .single() as { data: { buildings: { name: string; address: string } | null } | null };

    const building = membership?.buildings;

    setUserData({
      fullName: profile?.full_name || user.email || 'משתמש',
      buildingName: building?.address || building?.name || null,
      role: (profile?.role as 'admin' | 'committee' | 'tenant') || 'tenant',
    });

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={userData?.fullName || 'משתמש'}
        buildingName={userData?.buildingName || undefined}
        userRole="tenant"
      />
      <div className="flex">
        <Sidebar userRole="tenant" />
        <main className="flex-1 p-4 md:p-6 md:mr-64">
          {children}
        </main>
      </div>
    </div>
  );
}
