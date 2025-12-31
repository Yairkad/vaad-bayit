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
    { href: '/admin', icon: LayoutDashboard, label: t('dashboard'), borderColor: 'border-r-slate-400', activeColor: 'text-slate-600' },
    { href: '/admin/buildings', icon: Building2, label: t('buildings'), borderColor: 'border-r-blue-500', activeColor: 'text-blue-600' },
    { href: '/admin/users', icon: Users, label: 'משתמשים', borderColor: 'border-r-purple-500', activeColor: 'text-purple-600' },
    { href: '/admin/requests', icon: Inbox, label: 'פניות חדשות', borderColor: 'border-r-amber-500', activeColor: 'text-amber-600' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard'), borderColor: 'border-r-slate-400', activeColor: 'text-slate-600' },
    { href: '/dashboard/tenants', icon: Users, label: t('tenants'), borderColor: 'border-r-green-500', activeColor: 'text-green-600' },
    { href: '/dashboard/payments', icon: CreditCard, label: t('payments'), borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600' },
    { href: '/dashboard/expenses', icon: Receipt, label: t('expenses'), borderColor: 'border-r-rose-500', activeColor: 'text-rose-600' },
    { href: '/dashboard/treasury', icon: Wallet, label: 'קופה', borderColor: 'border-r-orange-500', activeColor: 'text-orange-600' },
    { href: '/dashboard/messages', icon: MessageSquare, label: t('messages'), borderColor: 'border-r-sky-500', activeColor: 'text-sky-600' },
    { href: '/dashboard/issues', icon: AlertTriangle, label: t('issues'), borderColor: 'border-r-red-500', activeColor: 'text-red-600' },
    { href: '/dashboard/documents', icon: FileText, label: t('documents'), borderColor: 'border-r-stone-400', activeColor: 'text-stone-600' },
    { href: '/dashboard/reports', icon: BarChart3, label: t('reports'), borderColor: 'border-r-indigo-500', activeColor: 'text-indigo-600' },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה', borderColor: 'border-r-lime-500', activeColor: 'text-lime-600' },
    { href: '/dashboard/building-settings', icon: Building2, label: 'הגדרות בניין', borderColor: 'border-r-zinc-400', activeColor: 'text-zinc-600' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: t('myArea'), borderColor: 'border-r-blue-500', activeColor: 'text-blue-600' },
    { href: '/tenant/payments', icon: CreditCard, label: t('payments'), borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600' },
    { href: '/tenant/messages', icon: MessageSquare, label: t('messages'), borderColor: 'border-r-sky-500', activeColor: 'text-sky-600' },
    { href: '/tenant/issues', icon: AlertTriangle, label: t('issues'), borderColor: 'border-r-red-500', activeColor: 'text-red-600' },
    { href: '/tenant/documents', icon: FileText, label: t('documents'), borderColor: 'border-r-stone-400', activeColor: 'text-stone-600' },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <aside className="fixed top-0 right-0 h-full w-64 bg-[#e8ecef] border-l border-[#d1d5db] flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-[#d1d5db]">
        <Link href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'} className="flex items-center gap-3">
          <img src="/icon.svg" alt="ועד בית" className="h-9 w-9" />
          <span className="text-xl font-bold text-gray-800">ועד בית</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
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
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-r-4',
                'bg-[#e8ecef] text-gray-600 hover:text-gray-800',
                link.borderColor,
                isActive
                  ? cn('shadow-[inset_3px_3px_6px_#c5c9cc,inset_-3px_-3px_6px_#ffffff]', link.activeColor)
                  : 'shadow-[4px_4px_8px_#c5c9cc,-4px_-4px_8px_#ffffff]',
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
