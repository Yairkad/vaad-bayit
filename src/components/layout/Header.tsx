'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Menu,
  Building2,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  MessageSquare,
  AlertTriangle,
  FileText,
  BarChart3,
  Link2,
  Inbox,
  Wallet,
  CircleDollarSign,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { BugReportDialog } from '@/components/BugReportDialog';
import { BuildingSwitcher } from '@/components/BuildingSwitcher';
import { useBuilding } from '@/contexts/BuildingContext';

interface HeaderProps {
  userName: string;
  userRole?: 'admin' | 'committee' | 'tenant';
}

export function Header({ userName, userRole = 'committee' }: HeaderProps) {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const router = useRouter();

  // Get building logo for committee members
  let buildingLogo: string | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { currentBuilding } = useBuilding();
    buildingLogo = currentBuilding?.logo_url || null;
  } catch {
    // Not inside BuildingProvider (admin/tenant) - use default logo
  }
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Update time every minute
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const formatHebrewDate = (date: Date) => {
    return date.toLocaleDateString('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatGregorianDate = (date: Date) => {
    return date.toLocaleDateString('he-IL');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const settingsHref = userRole === 'admin' ? '/admin/settings' : userRole === 'tenant' ? '/tenant/settings' : '/dashboard/settings';
  const profileHref = userRole === 'admin' ? '/admin/profile' : userRole === 'tenant' ? '/tenant/settings' : '/dashboard/settings';

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const adminLinks = [
    { href: '/admin', icon: LayoutDashboard, label: tNav('dashboard'), borderColor: 'border-r-slate-400', activeColor: 'text-slate-600' },
    { href: '/admin/buildings', icon: Building2, label: tNav('buildings'), borderColor: 'border-r-blue-500', activeColor: 'text-blue-600' },
    { href: '/admin/users', icon: Users, label: 'משתמשים', borderColor: 'border-r-purple-500', activeColor: 'text-purple-600' },
    { href: '/admin/requests', icon: Inbox, label: 'פניות חדשות', borderColor: 'border-r-amber-500', activeColor: 'text-amber-600' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: tNav('dashboard'), borderColor: 'border-r-slate-400', activeColor: 'text-slate-600' },
    { href: '/dashboard/tenants', icon: Users, label: tNav('tenants'), borderColor: 'border-r-green-500', activeColor: 'text-green-600' },
    { href: '/dashboard/payments', icon: CreditCard, label: tNav('payments'), borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600' },
    { href: '/dashboard/expenses', icon: Receipt, label: tNav('expenses'), borderColor: 'border-r-rose-500', activeColor: 'text-rose-600' },
    { href: '/dashboard/treasury', icon: Wallet, label: 'קופה', borderColor: 'border-r-orange-500', activeColor: 'text-orange-600' },
    { href: '/dashboard/messages', icon: MessageSquare, label: tNav('messages'), borderColor: 'border-r-sky-500', activeColor: 'text-sky-600' },
    { href: '/dashboard/issues', icon: AlertTriangle, label: tNav('issues'), borderColor: 'border-r-red-500', activeColor: 'text-red-600' },
    { href: '/dashboard/documents', icon: FileText, label: tNav('documents'), borderColor: 'border-r-stone-400', activeColor: 'text-stone-600' },
    { href: '/dashboard/reports', icon: BarChart3, label: tNav('reports'), borderColor: 'border-r-indigo-500', activeColor: 'text-indigo-600' },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה', borderColor: 'border-r-lime-500', activeColor: 'text-lime-600' },
    { href: '/dashboard/building-settings', icon: Building2, label: 'הגדרות בניין', borderColor: 'border-r-zinc-400', activeColor: 'text-zinc-600' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: tNav('myArea'), borderColor: 'border-r-blue-500', activeColor: 'text-blue-600' },
    { href: '/tenant/payments', icon: CreditCard, label: tNav('payments'), borderColor: 'border-r-yellow-500', activeColor: 'text-yellow-600' },
    { href: '/tenant/messages', icon: MessageSquare, label: tNav('messages'), borderColor: 'border-r-sky-500', activeColor: 'text-sky-600' },
    { href: '/tenant/issues', icon: AlertTriangle, label: tNav('issues'), borderColor: 'border-r-red-500', activeColor: 'text-red-600' },
    { href: '/tenant/documents', icon: FileText, label: tNav('documents'), borderColor: 'border-r-stone-400', activeColor: 'text-stone-600' },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <>
    <header className="sticky top-0 z-30 h-16 bg-gradient-header border-b">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0 flex flex-col bg-[#e8ecef]" aria-describedby={undefined}>
            <VisuallyHidden>
              <SheetTitle>תפריט ניווט</SheetTitle>
            </VisuallyHidden>
            {/* Logo */}
            <div className="p-5 border-b border-[#d1d5db]">
              <Link
                href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3"
              >
                <img
                  src={buildingLogo || '/icon.svg'}
                  alt="לוגו"
                  className="h-9 w-9 rounded-lg object-cover"
                />
                <span className="text-xl font-bold text-gray-800">ועד בית</span>
              </Link>
            </div>

            {/* Building Switcher on mobile */}
            {userRole === 'committee' && (
              <div className="px-5 py-3 border-b border-[#d1d5db] bg-[#dde1e4]">
                <BuildingSwitcher />
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {links.map((link) => {
                const isRootPath = link.href === '/dashboard' || link.href === '/admin' || link.href === '/tenant';
                const isActive = isRootPath
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full border-r-4',
                      'bg-[#e8ecef] text-gray-600 hover:text-gray-800',
                      link.borderColor,
                      isActive
                        ? cn('shadow-[inset_3px_3px_6px_#c5c9cc,inset_-3px_-3px_6px_#ffffff]', link.activeColor)
                        : 'shadow-[4px_4px_8px_#c5c9cc,-4px_-4px_8px_#ffffff]'
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-[#d1d5db] mt-auto bg-[#dde1e4]">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>גירסה 1.0.0</span>
                <BugReportDialog
                  trigger={
                    <button className="text-blue-600 hover:underline">
                      דווח על באג
                    </button>
                  }
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo for mobile */}
        <Link
          href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'}
          className="md:hidden flex items-center gap-2"
        >
          <img src="/icon.svg" alt="ועד בית" className="h-6 w-6" />
          <span className="font-semibold">ועד בית</span>
        </Link>

        {/* Building Switcher - desktop only, for committee members with multiple buildings */}
        {userRole === 'committee' && (
          <div className="hidden md:block">
            <BuildingSwitcher />
          </div>
        )}

        <div className="flex-1" />

        {/* Date and Time Display */}
        {currentTime && (
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground bg-white/50 px-3 py-1.5 rounded-lg">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{formatHebrewDate(currentTime)}</span>
            <span className="text-muted-foreground/60">|</span>
            <span>{formatGregorianDate(currentTime)}</span>
            <span className="text-muted-foreground/60">|</span>
            <span className="font-mono">{formatTime(currentTime)}</span>
          </div>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={settingsHref}>
                <Settings className="ml-2 h-4 w-4" />
                {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="ml-2 h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    {/* Mobile Date/Time Bar */}
    {currentTime && (
      <div className="lg:hidden sticky top-16 z-20 bg-gradient-to-r from-slate-100 to-slate-50 border-b px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span className="font-medium">{formatHebrewDate(currentTime)}</span>
        <span className="text-muted-foreground/60">|</span>
        <span>{formatGregorianDate(currentTime)}</span>
        <span className="text-muted-foreground/60">|</span>
        <span className="font-mono">{formatTime(currentTime)}</span>
      </div>
    )}
    </>
  );
}
