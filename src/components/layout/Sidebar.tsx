'use client';

import { useState, useTransition } from 'react';
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
  Link2,
  Inbox,
  Loader2,
  Wallet,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

interface SidebarProps {
  userRole: 'admin' | 'committee' | 'tenant';
}

export function Sidebar({ userRole }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: t('dashboard'), color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { href: '/admin/buildings', icon: Building2, label: t('buildings'), color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { href: '/admin/users', icon: Users, label: 'משתמשים', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { href: '/admin/requests', icon: Inbox, label: 'פניות חדשות', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard'), color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { href: '/dashboard/tenants', icon: Users, label: t('tenants'), color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { href: '/dashboard/payments', icon: CreditCard, label: t('payments'), color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { href: '/dashboard/expenses', icon: Receipt, label: t('expenses'), color: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
    { href: '/dashboard/treasury', icon: Wallet, label: 'קופה', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { href: '/dashboard/messages', icon: MessageSquare, label: t('messages'), color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
    { href: '/dashboard/issues', icon: AlertTriangle, label: t('issues'), color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { href: '/dashboard/documents', icon: FileText, label: t('documents'), color: 'bg-stone-100 text-stone-700 hover:bg-stone-200' },
    { href: '/dashboard/reports', icon: BarChart3, label: t('reports'), color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה', color: 'bg-lime-100 text-lime-700 hover:bg-lime-200' },
    { href: '/dashboard/building-settings', icon: Building2, label: 'הגדרות בניין', color: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: t('myArea'), color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { href: '/tenant/payments', icon: CreditCard, label: t('payments'), color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { href: '/tenant/messages', icon: MessageSquare, label: t('messages'), color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
    { href: '/tenant/issues', icon: AlertTriangle, label: t('issues'), color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { href: '/tenant/documents', icon: FileText, label: t('documents'), color: 'bg-stone-100 text-stone-700 hover:bg-stone-200' },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <aside className="fixed top-0 right-0 h-full w-64 bg-gradient-sidebar border-l flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'} className="flex items-center gap-2">
          <img src="/icon.svg" alt="ועד בית" className="h-8 w-8" />
          <span className="text-xl font-bold">{t('dashboard')}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          // Check if this is an exact match or a sub-path match (but not for root paths)
          const isRootPath = link.href === '/dashboard' || link.href === '/admin' || link.href === '/tenant';
          const isActive = isRootPath
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(link.href + '/');
          const isLoading = isPending && pendingHref === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              onClick={(e) => {
                if (isActive) return;
                e.preventDefault();
                setPendingHref(link.href);
                startTransition(() => {
                  router.push(link.href);
                });
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? cn(link.color, 'ring-2 ring-offset-1 ring-current/30 shadow-sm')
                  : link.color,
                isLoading && 'opacity-70'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <link.icon className="h-5 w-5" />
              )}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t mt-auto bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>גירסה 1.0.0</span>
          <a
            href="mailto:support@vaad-bayit.co.il?subject=דיווח באג / הצעת שיפור"
            className="text-primary hover:underline"
          >
            דווח על באג
          </a>
        </div>
      </div>
    </aside>
  );
}
