'use client';

import { useState } from 'react';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  userName: string;
  buildingName?: string;
  userRole?: 'admin' | 'committee' | 'tenant';
}

export function Header({ userName, buildingName, userRole = 'committee' }: HeaderProps) {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
    { href: '/admin', icon: LayoutDashboard, label: tNav('dashboard') },
    { href: '/admin/buildings', icon: Building2, label: tNav('buildings') },
    { href: '/admin/users', icon: Users, label: 'משתמשים' },
    { href: '/admin/requests', icon: Inbox, label: 'פניות חדשות' },
  ];

  const committeeLinks = [
    { href: '/dashboard', icon: LayoutDashboard, label: tNav('dashboard') },
    { href: '/dashboard/tenants', icon: Users, label: tNav('tenants') },
    { href: '/dashboard/payments', icon: CreditCard, label: tNav('payments') },
    { href: '/dashboard/extra-charges', icon: CircleDollarSign, label: 'חיובים נוספים' },
    { href: '/dashboard/expenses', icon: Receipt, label: tNav('expenses') },
    { href: '/dashboard/treasury', icon: Wallet, label: 'קופה' },
    { href: '/dashboard/messages', icon: MessageSquare, label: tNav('messages') },
    { href: '/dashboard/issues', icon: AlertTriangle, label: tNav('issues') },
    { href: '/dashboard/documents', icon: FileText, label: tNav('documents') },
    { href: '/dashboard/reports', icon: BarChart3, label: tNav('reports') },
    { href: '/dashboard/invites', icon: Link2, label: 'קישורי הזמנה' },
    { href: '/dashboard/building-settings', icon: Building2, label: 'הגדרות בניין' },
  ];

  const tenantLinks = [
    { href: '/tenant', icon: LayoutDashboard, label: tNav('myArea') },
    { href: '/tenant/payments', icon: CreditCard, label: tNav('payments') },
    { href: '/tenant/messages', icon: MessageSquare, label: tNav('messages') },
    { href: '/tenant/issues', icon: AlertTriangle, label: tNav('issues') },
    { href: '/tenant/documents', icon: FileText, label: tNav('documents') },
  ];

  const links = userRole === 'admin' ? adminLinks : userRole === 'committee' ? committeeLinks : tenantLinks;

  return (
    <header className="sticky top-0 z-30 h-16 bg-gradient-header border-b">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b">
              <Link
                href={userRole === 'admin' ? '/admin' : userRole === 'tenant' ? '/tenant' : '/dashboard'}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2"
              >
                <img src="/icon.svg" alt="ועד בית" className="h-8 w-8" />
                <span className="text-xl font-bold">ועד בית</span>
              </Link>
            </div>

            {/* Building info on mobile */}
            {buildingName && (
              <div className="px-6 py-3 border-b bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{buildingName}</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {links.map((link) => {
                // Check if this is an exact match or a sub-path match (but not for root paths)
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full',
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
            <div className="p-4 border-t space-y-1 mt-auto">
              <Link
                href={settingsHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
              >
                <Settings className="h-5 w-5" />
                {tNav('settings')}
              </Link>
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="h-5 w-5" />
                התנתקות
              </button>
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

        {/* Building info - desktop only */}
        {buildingName && (
          <div className="hidden md:flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{buildingName}</span>
          </div>
        )}

        <div className="flex-1" />

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
  );
}
