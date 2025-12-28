'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  MessageSquare,
  AlertTriangle,
  FileText,
  BarChart3,
  Building2,
  Settings,
  LogOut,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/navigation';

interface SidebarProps {
  userRole: 'admin' | 'committee' | 'tenant';
}

export function Sidebar({ userRole }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/admin/buildings', icon: Building2, label: t('buildings') },
    { href: '/admin/users', icon: Users, label: 'משתמשים' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/dashboard/tenants', icon: Users, label: t('tenants') },
    { href: '/dashboard/payments', icon: CreditCard, label: t('payments') },
    { href: '/dashboard/expenses', icon: Receipt, label: t('expenses') },
    { href: '/dashboard/messages', icon: MessageSquare, label: t('messages') },
    { href: '/dashboard/issues', icon: AlertTriangle, label: t('issues') },
    { href: '/dashboard/documents', icon: FileText, label: t('documents') },
    { href: '/dashboard/reports', icon: BarChart3, label: t('reports') },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: t('myArea') },
    { href: '/tenant/payments', icon: CreditCard, label: t('payments') },
    { href: '/tenant/messages', icon: MessageSquare, label: t('messages') },
    { href: '/tenant/issues', icon: AlertTriangle, label: t('issues') },
    { href: '/tenant/documents', icon: FileText, label: t('documents') },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <aside className="fixed top-0 right-0 h-full w-64 bg-card border-l flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">{t('dashboard')}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
          {t('settings')}
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          התנתקות
        </Button>
      </div>
    </aside>
  );
}
