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
  Quote,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { BugReportDialog } from '@/components/BugReportDialog';
import { useBuilding } from '@/contexts/BuildingContext';

interface SidebarProps {
  userRole: 'admin' | 'committee' | 'tenant';
}

export function Sidebar({ userRole }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Get building info for committee members
  let buildingLogo: string | null = null;
  let buildingName: string | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { currentBuilding } = useBuilding();
    buildingLogo = currentBuilding?.logo_url || null;
    buildingName = currentBuilding?.name || currentBuilding?.address || null;
  } catch {
    // Not inside BuildingProvider (admin/tenant) - use default logo
  }

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: t('dashboard'), borderColor: 'border-r-slate-400', activeColor: 'text-slate-600', activeBg: 'bg-slate-100' },
    { href: '/admin/buildings', icon: Building2, label: t('buildings'), borderColor: 'border-r-blue-500', activeColor: 'text-blue-600', activeBg: 'bg-blue-50' },
    { href: '/admin/users', icon: Users, label: 'משתמשים', borderColor: 'border-r-purple-500', activeColor: 'text-purple-600', activeBg: 'bg-purple-50' },
    { href: '/admin/requests', icon: Inbox, label: 'פניות חדשות', borderColor: 'border-r-amber-500', activeColor: 'text-amber-600', activeBg: 'bg-amber-50' },
    { href: '/admin/testimonials', icon: Quote, label: 'המלצות', borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600', activeBg: 'bg-yellow-50' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard'), borderColor: 'border-r-slate-400', activeColor: 'text-slate-600', activeBg: 'bg-slate-100' },
    { href: '/dashboard/tenants', icon: Users, label: t('tenants'), borderColor: 'border-r-green-500', activeColor: 'text-green-600', activeBg: 'bg-green-50' },
    { href: '/dashboard/payments', icon: CreditCard, label: t('payments'), borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600', activeBg: 'bg-yellow-50' },
    { href: '/dashboard/expenses', icon: Receipt, label: t('expenses'), borderColor: 'border-r-rose-500', activeColor: 'text-rose-600', activeBg: 'bg-rose-50' },
    { href: '/dashboard/treasury', icon: Wallet, label: 'קופה', borderColor: 'border-r-orange-500', activeColor: 'text-orange-600', activeBg: 'bg-orange-50' },
    { href: '/dashboard/messages', icon: MessageSquare, label: t('messages'), borderColor: 'border-r-sky-500', activeColor: 'text-sky-600', activeBg: 'bg-sky-50' },
    { href: '/dashboard/issues', icon: AlertTriangle, label: t('issues'), borderColor: 'border-r-red-500', activeColor: 'text-red-600', activeBg: 'bg-red-50' },
    { href: '/dashboard/documents', icon: FileText, label: t('documents'), borderColor: 'border-r-stone-400', activeColor: 'text-stone-600', activeBg: 'bg-stone-100' },
    { href: '/dashboard/reports', icon: BarChart3, label: t('reports'), borderColor: 'border-r-indigo-500', activeColor: 'text-indigo-600', activeBg: 'bg-indigo-50' },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה', borderColor: 'border-r-lime-500', activeColor: 'text-lime-600', activeBg: 'bg-lime-50' },
    { href: '/dashboard/building-settings', icon: Building2, label: 'הגדרות בניין', borderColor: 'border-r-zinc-400', activeColor: 'text-zinc-600', activeBg: 'bg-zinc-100' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: t('myArea'), borderColor: 'border-r-blue-500', activeColor: 'text-blue-600', activeBg: 'bg-blue-50' },
    { href: '/tenant/payments', icon: CreditCard, label: t('payments'), borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600', activeBg: 'bg-yellow-50' },
    { href: '/tenant/messages', icon: MessageSquare, label: t('messages'), borderColor: 'border-r-sky-500', activeColor: 'text-sky-600', activeBg: 'bg-sky-50' },
    { href: '/tenant/issues', icon: AlertTriangle, label: t('issues'), borderColor: 'border-r-red-500', activeColor: 'text-red-600', activeBg: 'bg-red-50' },
    { href: '/tenant/documents', icon: FileText, label: t('documents'), borderColor: 'border-r-stone-400', activeColor: 'text-stone-600', activeBg: 'bg-stone-100' },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <aside className="fixed top-0 right-0 h-full w-64 bg-gradient-to-l from-[#e2e6e9] to-[#eef1f4] border-l border-[#d1d5db] flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-[#d1d5db]">
        <Link href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'} className="flex items-center gap-3">
          <img
            src={buildingLogo || '/icon.svg'}
            alt="לוגו"
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="text-xl font-bold text-gray-800 truncate max-w-[160px]">{buildingName || 'בית+'}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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
                'group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'border-r-[3px]',
                link.borderColor,
                isActive
                  ? cn(
                      link.activeBg,
                      'shadow-lg shadow-black/5',
                      link.activeColor
                    )
                  : cn(
                      'bg-white/40 hover:bg-white/70 text-gray-600 hover:text-gray-800',
                      'hover:shadow-md hover:shadow-black/5'
                    ),
                isLoading && 'opacity-70'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <link.icon className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  !isActive && 'group-hover:scale-110'
                )} />
              )}
              {link.label}
              {isActive && (
                <div className="mr-auto w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t mt-auto bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>גירסה 1.0.0</span>
          <BugReportDialog
            trigger={
              <button className="text-primary hover:underline">
                דווח על באג
              </button>
            }
          />
        </div>
      </div>
    </aside>
  );
}
